// The ONLY chrome-coupled module. All decisions are delegated to the pure modules
// (schedule.js / rules.js / pin.js); this file just wires them to chrome.* APIs:
//   - keeps the DNR rule set reconciled to the schedule on a 1-minute alarm,
//   - handles the PIN-unlock message from the blocked page,
//   - exposes a dev "test clock" so the schedule can be exercised without waiting.

import { config } from './config.js';
import { isWithinWindow } from './schedule.js';
import {
  buildBaseRules,
  allowRule,
  registrableForHost,
  allowIdFor,
  RULE_IDS,
} from './rules.js';
import { verifyPin } from './pin.js';

const TICK_ALARM = 'tick';
const BASE_RULE_IDS = Object.values(RULE_IDS);
const ALL_DOMAINS = [...config.alwaysBlocked, ...config.scheduledDomains];

// ── Test clock ───────────────────────────────────────────────────────────────
// Reads an override from chrome.storage.session (cleared on browser restart).
// Returns { minutes, day } where day is 0=Sun..6=Sat.
async function getNow() {
  try {
    const { __testNow } = await chrome.storage.session.get('__testNow');
    if (__testNow) return __testNow;
  } catch {
    /* storage.session unavailable — fall through to real clock */
  }
  const d = new Date();
  return { minutes: d.getHours() * 60 + d.getMinutes(), day: d.getDay() };
}

// ── Reconcile base rules to the current schedule (idempotent) ────────────────
async function reconcile() {
  const now = await getNow();
  const youtubeActive = isWithinWindow(config.schedule, now.minutes, now.day);
  const desired = buildBaseRules(config, chrome.runtime.id, youtubeActive);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: BASE_RULE_IDS, // removing absent ids is a no-op
    addRules: desired,
  });
  await expireUnlocks();
}

// ── Temporary PIN unlocks (dynamic ALLOW rules with a TTL) ───────────────────
async function expireUnlocks() {
  const { unlocks = {} } = await chrome.storage.session.get('unlocks');
  const nowMs = Date.now();
  const removeRuleIds = [];
  let changed = false;
  for (const [domain, info] of Object.entries(unlocks)) {
    if (info.expiry <= nowMs) {
      removeRuleIds.push(info.ruleId);
      delete unlocks[domain];
      changed = true;
    }
  }
  if (removeRuleIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
  }
  if (changed) await chrome.storage.session.set({ unlocks });
}

// Add (or refresh) a main_frame ALLOW rule for the domain behind `originalUrl`.
// Awaited fully so the rule is live BEFORE the blocked page navigates back.
async function unlock(originalUrl) {
  let host;
  try {
    host = new URL(originalUrl).hostname;
  } catch {
    return false;
  }
  const domain = registrableForHost(host, ALL_DOMAINS);
  if (!domain) return false;

  const ruleId = allowIdFor(domain, ALL_DOMAINS);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
    addRules: [allowRule(ruleId, domain)],
  });

  const { unlocks = {} } = await chrome.storage.session.get('unlocks');
  unlocks[domain] = { ruleId, expiry: Date.now() + config.unlockTtlMinutes * 60000 };
  await chrome.storage.session.set({ unlocks });
  return true;
}

// ── Messaging from the PIN page ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'unlock') return false;
  (async () => {
    const ok = await verifyPin(msg.pin ?? '', config.pin.salt, config.pin.hash);
    if (!ok) {
      sendResponse({ ok: false, error: 'Incorrect PIN.' });
      return;
    }
    const done = await unlock(msg.url ?? '');
    sendResponse(done ? { ok: true } : { ok: false, error: 'Unrecognized site.' });
  })();
  return true; // keep the channel open for the async response
});

// ── Lifecycle ────────────────────────────────────────────────────────────────
async function setup() {
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  await reconcile();
}

chrome.runtime.onInstalled.addListener(setup);
chrome.runtime.onStartup.addListener(setup);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK_ALARM) reconcile();
});
// Reconcile whenever the worker wakes (covers SW restarts between alarms).
reconcile();

// ── Dev helpers (call from the service-worker DevTools console) ───────────────
// setTestNow('23:00')  -> pretend it's 23:00 today and re-reconcile.
// setTestNow('06:30', 2) -> 06:30 on Tuesday (0=Sun..6=Sat).
// clearTestNow()       -> back to the real clock.
// showRules()          -> dump the active dynamic rules.
self.setTestNow = async (hhmm, day) => {
  const [h, m = 0] = String(hhmm).split(':').map(Number);
  const value = { minutes: h * 60 + m, day: day ?? new Date().getDay() };
  await chrome.storage.session.set({ __testNow: value });
  await reconcile();
  return value;
};
self.clearTestNow = async () => {
  await chrome.storage.session.remove('__testNow');
  await reconcile();
};
self.showRules = () => chrome.declarativeNetRequest.getDynamicRules();

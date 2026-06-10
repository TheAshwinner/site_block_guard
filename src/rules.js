// Pure declarativeNetRequest rule builders. No chrome.* here — the service worker
// passes in the runtime extension id and the "is YouTube currently blocked" flag,
// and gets back plain rule objects. That keeps rule shapes unit-testable.
//
// Design (per domain group):
//   - main_frame navigation  -> REDIRECT to the bundled PIN page (FR6), carrying the
//                               original URL in the fragment so the page can return to it.
//   - sub_frame (embeds)     -> BLOCK outright (FR3): embeds are never PIN-prompted.
// A correct PIN adds a temporary higher-priority ALLOW rule (main_frame only), so the
// page loads while embeds stay blocked.

// Fixed ids for the always-present base rules (kept small + stable so reconcile can
// remove-then-add them every tick).
export const RULE_IDS = {
  ALWAYS_REDIRECT: 1,
  ALWAYS_BLOCK: 2,
  YT_REDIRECT: 3,
  YT_BLOCK: 4,
};

// Dynamic per-domain ALLOW (unlock) rules live in their own id range.
export const ALLOW_RULE_BASE = 9000;

const BASE_PRIORITY = 1;
const ALLOW_PRIORITY = 2; // higher than base; `allow` also outranks block/redirect.

/** Full URL of the bundled PIN page for a given extension id. */
export function blockedPageUrl(extensionId) {
  return `chrome-extension://${extensionId}/ui/blocked.html`;
}

function redirectRule(id, domains, extensionId) {
  return {
    id,
    priority: BASE_PRIORITY,
    action: {
      type: 'redirect',
      // \1 = the whole matched URL, appended to the PIN page as a fragment.
      redirect: { regexSubstitution: `${blockedPageUrl(extensionId)}#\\1` },
    },
    condition: {
      requestDomains: domains,
      regexFilter: '^(https?://.*)$',
      resourceTypes: ['main_frame'],
    },
  };
}

function blockRule(id, domains) {
  return {
    id,
    priority: BASE_PRIORITY,
    action: { type: 'block' },
    condition: {
      requestDomains: domains,
      resourceTypes: ['sub_frame'],
    },
  };
}

/** Temporary unlock rule: allow main_frame to a domain (embeds stay blocked). */
export function allowRule(id, domain) {
  return {
    id,
    priority: ALLOW_PRIORITY,
    action: { type: 'allow' },
    condition: { requestDomains: [domain], resourceTypes: ['main_frame'] },
  };
}

/**
 * The base rule set: always-blocked sites are always present; the YouTube pair is
 * included only when `youtubeActive` (i.e. inside the schedule window).
 */
export function buildBaseRules(config, extensionId, youtubeActive) {
  const rules = [
    redirectRule(RULE_IDS.ALWAYS_REDIRECT, config.alwaysBlocked, extensionId),
    blockRule(RULE_IDS.ALWAYS_BLOCK, config.alwaysBlocked),
  ];
  if (youtubeActive) {
    rules.push(redirectRule(RULE_IDS.YT_REDIRECT, config.scheduledDomains, extensionId));
    rules.push(blockRule(RULE_IDS.YT_BLOCK, config.scheduledDomains));
  }
  return rules;
}

/** Match a request hostname to one of the configured registrable domains. */
export function registrableForHost(host, domains) {
  const h = String(host).toLowerCase();
  return domains.find((d) => h === d || h.endsWith(`.${d}`)) || null;
}

/** Stable, unique ALLOW-rule id for a configured domain (by position in the list). */
export function allowIdFor(domain, allDomains) {
  const i = allDomains.indexOf(domain);
  return i < 0 ? null : ALLOW_RULE_BASE + i;
}

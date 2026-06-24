// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH (NFR4). Edit sites, schedule, and PIN here only.
// No chrome.* references so this loads in both the extension and `node --test`.
// ─────────────────────────────────────────────────────────────────────────────

import { hm } from './schedule.js';

export const config = {
  // FR1 — blocked 24/7 (whole domain + subdomains + subpaths).
  alwaysBlocked: ['linkedin.com', 'facebook.com', 'x.com', 'fandom.com', 'instagram.com', 'tiktok.com', 'spacebattles.com', 'imdb.com', 'wco.tv'],

  // FR2/FR3 — blocked only inside the schedule window; embeds follow the same window (FR4).
  scheduledDomains: ['youtube.com', 'youtube-nocookie.com', 'youtu.be'],

  // FR2 — nightly window 20:00–07:00 (crosses midnight). days: 0=Sun..6=Sat.
  schedule: {
    startMin: hm(20, 0),
    endMin: hm(7, 0),
    days: [0, 1, 2, 3, 4, 5, 6],
  },

  // FR6 — how long a correct-PIN unlock lasts before the site re-locks.
  unlockTtlMinutes: 5,

  // FR6 — PIN is stored as a salted SHA-256 hash, never plaintext.
  // Default PIN is "246813". To change it, run:  npm run set-pin <newpin>
  // (see tools/set-pin.mjs), then paste the printed salt+hash below.
  pin: {
    salt: 'fb009cb8d3fbf1b2',
    hash: '826b2ab9c4de760199373e692b03ceb241bb161a8930f0b10873b008e1f97659',
  },
};

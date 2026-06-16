# site_block_guard

A personal Chrome (Manifest V3) extension that blocks distracting sites:

- **Always-blocked** sites (LinkedIn, Facebook, X, Fandom, Instagram, TikTok, SpaceBattles) — 24/7.
- **Scheduled** site (YouTube) — blocked only during a nightly window (default 20:00–07:00).
- **Embed-aware** — blocks YouTube `<iframe>` embeds on third-party pages during the window,
  not just direct navigation.
- **PIN-gated** — a blocked page redirects to a bundled PIN page; the correct PIN unlocks
  the site temporarily.
- Works in **incognito** (enable "Allow in incognito" per-extension).

See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for the full spec.

## How it's built

All decision logic lives in **pure, browser-free modules** so it can be unit-tested in Node
without a browser. `background.js` is the only file that touches `chrome.*`.

```
manifest.json          MV3 manifest (declarativeNetRequest + alarms + storage)
src/
  config.js            single source of truth: sites, schedule, PIN (NFR4)
  schedule.js          pure: is "now" inside the window? (handles midnight crossing)
  rules.js             pure: builds the declarativeNetRequest rules from config
  pin.js               pure: salted SHA-256 PIN hashing/verification
  background.js        chrome glue: alarm reconcile, PIN unlock, dev test-clock
ui/blocked.html/.js    the PIN page (a bundled extension page — no server)
test/                  node:test unit tests + an embed fixture
TEST_PLAN.md           manual in-browser checklist (AT1–AT5)
```

Blocking model: per domain, a `main_frame` navigation is **redirected** to the PIN page,
while `sub_frame` (embed) requests are **blocked** outright. A correct PIN adds a temporary
higher-priority `allow` rule (main_frame only), so the page loads while embeds stay blocked.
YouTube's rule pair is toggled on/off each minute by an alarm that reconciles against the
schedule.

## Run the tests

```sh
npm test          # unit tests: schedule math, PIN, rule shapes
```

Then follow [`TEST_PLAN.md`](./TEST_PLAN.md) for the in-browser checks. It uses a **test
clock** (`setTestNow('23:00')` in the service-worker console) so you can verify the schedule
without waiting until night.

### Sites to test manually

Real third-party pages that embed YouTube `<iframe>`s — useful for verifying embed blocking
(FR3/FR4). Open each **inside the schedule window** (or `setTestNow('21:00')`); the embedded
players should fail to load. Outside the window they should play.

- https://forums.spacebattles.com/threads/sword-art-online-abridged-or-how-to-make-a-crap-franchise-worth-watching.350589
  (also exercises the always-blocked `spacebattles.com` rule — the page itself should redirect
  to the PIN page 24/7)
- https://www.deltanews.tv/lifestyles/entertainment/snl-weekend-update-joke-swap-drops-jaws-with-raunchy-punchlines/article_5d9d5db0-1f40-50d2-bcb6-fb0abfd311df.html

> Reminder: extensions are disabled in Incognito by default — enable **Details → Allow in
> incognito** if testing in an incognito window, or these checks will appear to "not work".

## Install (unpacked)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. (Optional) **Details → Allow in incognito** for incognito coverage.

## Configure

Everything is in [`src/config.js`](./src/config.js): the site lists, the schedule window /
days, and the unlock TTL.

Change the PIN:

```sh
npm run set-pin 135790      # prints a fresh salt + hash
# paste the printed block into config.pin in src/config.js, then Reload the extension
```

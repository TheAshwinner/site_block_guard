# Manual Test Plan

Two layers of testing:

1. **Automated unit tests** (the logic that's easy to get wrong — schedule math, PIN
   hashing, rule shapes). Run `npm test`. These need no browser.
2. **Manual in-browser checklist** (below) for the things only a real browser can
   prove — actual network blocking, the redirect-to-PIN page, embeds, incognito.

The schedule is exercised with a **test clock** so you never have to wait until 22:00.

---

## One-time setup

1. `chrome://extensions` → toggle **Developer mode** on.
2. **Load unpacked** → select this folder (`site_block_guard/`).
3. Open the service worker console: on the extension card click **service worker**
   (this is where you run `setTestNow(...)`).
4. For incognito tests (AT4): on the extension card → **Details** → enable
   **Allow in incognito**. *(This toggle cannot be automated — it must be done by hand.)*

**Test-clock commands** (run in the service-worker console):

| Command | Meaning |
| --- | --- |
| `setTestNow('23:00')` | pretend it's 23:00 today (inside the YouTube window) |
| `setTestNow('12:00')` | pretend it's noon (outside the window) |
| `setTestNow('06:30', 2)` | 06:30 on Tuesday (0=Sun..6=Sat) |
| `clearTestNow()` | back to the real clock |
| `showRules()` | dump the currently active dynamic rules |

> After loading the extension fresh, default the clock to a known state before testing,
> e.g. `setTestNow('12:00')` (YouTube allowed) or `setTestNow('23:00')` (YouTube blocked).

Default PIN is **246813** (change via `npm run set-pin <newpin>`, then paste into `src/config.js`).

---

## AT1 — Always-blocked sites (FR1, FR6)

For each of `linkedin.com`, `facebook.com`, `x.com`, `fandom.com`:

- [ ] Visiting the site redirects to the **🔒 PIN page** (not the site).
- [ ] Entering a **wrong** PIN shows "Incorrect PIN." and stays blocked.
- [ ] Entering the **correct** PIN loads the real site.
- [ ] After ~5 min (`unlockTtlMinutes`) the site re-locks on next visit.

## AT2 — Scheduled YouTube (FR2)

- [ ] `setTestNow('23:00')` → visiting `youtube.com` shows the PIN page.
- [ ] `setTestNow('12:00')` → `youtube.com` loads normally (no PIN).

## AT3 — Embedded YouTube (FR3, FR4)

Test with the **local fixture** and the **real article**:

- Local: open `test/fixtures/embed.html` via `file://` (drag into Chrome).
- Real: <https://www.deltanews.tv/lifestyles/entertainment/snl-weekend-update-joke-swap-drops-jaws-with-raunchy-punchlines/article_5d9d5db0-1f40-50d2-bcb6-fb0abfd311df.html>

Checks:

- [ ] `setTestNow('23:00')` → embedded player is **blocked** (blank frame).
- [ ] `setTestNow('12:00')` → embedded player **loads/plays**.
- [ ] Note: an embed is hard-blocked, **not** PIN-prompted inside the iframe (by design).

## AT4 — Incognito (FR5)

With **Allow in incognito** enabled, repeat AT1–AT3 in an incognito window.

- [ ] Always-blocked sites → PIN page.
- [ ] YouTube blocked/allowed per the test clock.
- [ ] Embeds blocked/allowed per the test clock.

## AT5 — Midnight crossing

The window is 22:00–07:00. Verify both sides of midnight:

- [ ] `setTestNow('21:59')` → YouTube allowed.
- [ ] `setTestNow('22:00')` → YouTube blocked.
- [ ] `setTestNow('06:59', d)` → YouTube blocked.
- [ ] `setTestNow('07:00', d)` → YouTube allowed.

*(The exact-minute boundary math is also covered by `npm test`.)*

---

## Troubleshooting

- **PIN page doesn't appear, site just fails to load** → `host_permissions` or
  `web_accessible_resources` issue; check the service-worker console for errors and
  confirm `showRules()` lists the redirect rule.
- **Schedule changes don't take effect** → re-run `setTestNow(...)` (it forces a
  reconcile), or check the `tick` alarm in `chrome://extensions` → service worker.
- **Edited config/rules** → click **Reload** on the extension card.

# Scheduled Embed-Aware Site Blocker — Requirements

## Purpose
A personal Chrome extension that blocks distracting sites, with two distinct behaviors: some sites blocked at all times, and at least one site (YouTube) blocked only during scheduled hours. Unlike page-level blockers, it must also block YouTube content **embedded** in other sites.

## Functional Requirements

### FR1 — Always-blocked sites
Block the following domains 24/7, all days: linkedin.com, facebook.com, x.com, fandom.com. Matching applies to the whole domain and its subpaths.

### FR2 — Scheduled site
Block youtube.com only during a defined daily time window. Outside that window the site is reachable. Window is configurable; days of week configurable. Windows that cross midnight (e.g. 22:00–07:00) must be supported.
For youtube.com, this should be blocked every night from 22:00 to 7:00

### FR3 — Embed blocking
Block YouTube content loaded as an embedded iframe (e.g. requests to `youtube.com/embed/...`) on third-party pages such as news articles, not just direct navigation to youtube.com. This is resource-level blocking, not page-level.

### FR4 — Embed/schedule relationship
Embedded YouTube follows the same schedule as the main site (FR2): blocked during the window, allowed outside it.

### FR5 — Incognito coverage
Extension must function in incognito windows. (Enabled via the per-extension "Allow in Incognito" toggle in chrome://extensions.)

### FR6 - Bypass resistance
All sites should have a password/PIN lock to open. In the future, I might consider making this resistance harder.

## Non-Functional Requirements

- **NFR1 — Platform:** Chrome, Manifest V3. Use `declarativeNetRequest` for blocking and `alarms` for the schedule timer. (If such an extension also works in firefox, that is a plus. But stick with Chrome for now.)
- **NFR2 — Distribution:** Loaded unpacked via Developer Mode; no Web Store publishing required.
- **NFR3 — Footprint:** Minimal. Static rule list plus a small background service worker; no external servers, accounts, or data collection.
- **NFR4 — Maintainability:** Site list and schedule editable in one place (a config object or rules file) without rewriting logic.

## Out of Scope
- Time-quota / daily-allowance limits (block-after-N-minutes).
- Redirect-on-block pages.
- Cross-device sync.
- Settings UI (configuration via editing the source is acceptable for a personal tool).

## Acceptance Tests
- AT1: Each always-blocked site is unreachable at any hour, any day.
- AT2: youtube.com is blocked inside the window and loads outside it.
- AT3: A news article with an embedded YouTube player shows the player blocked per FR4's chosen behavior.
    - (For example, the following article should block the embedded youtube video: https://www.deltanews.tv/lifestyles/entertainment/snl-weekend-update-joke-swap-drops-jaws-with-raunchy-punchlines/article_5d9d5db0-1f40-50d2-bcb6-fb0abfd311df.html)
- AT4: All of the above hold in an incognito window.
- AT5: A midnight-crossing window (e.g. 22:00–07:00) blocks correctly on both sides of midnight.
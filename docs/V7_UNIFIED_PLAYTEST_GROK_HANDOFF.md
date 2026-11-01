# Unified V7 playtest shell — Grok handoff (2026-11-01)

## Source of truth and safety
Only repo DiamondIQ2026/warriors-hit-lab. Diamond IQ is unrelated and must never be edited.
PR #15 targets draft PR #14, which targets PR #6, which targets main. **Do not merge or deploy** without the owner's explicit approval. Do not change live career saves, Pages settings, or production.

## Actual integrated work
- Added `v7/preview.html` and `v7/flight-browser.js` from draft PR #5 to the multiplayer integration branch as isolated assets.
- Added optional `#viewFlight` and `<dialog id="flightDialog">` to `v7/multiplayer.html`. The animated iframe is sandboxed (`allow-scripts`) and user-dismissable.
- `v7/pass-and-play-ui.js` connects an already-recorded swing's net zone, power, simulated outcome and batting hand to the preview. Visualization opens **after** the engine commits a swing, does not change game state, and removing iframe src closes it.
- `tests/v7-multiplayer-browser.test.cjs` verifies at iPhone-sized viewport: record swing; open preview; play; skip; close; confirm multiplayer localStorage identical and legacy solo career absent.
- PR #15 also inherits PR #14 mobile above-fold keyboard handoff and PR #6 tested pass-and-play scoring.
- No full stadium animation, fielders, runner graphics, production integration, or true physical tracking. Outcome selector remains QA manual.

## Current validation
CI workflow `Hit Lab - V7 Pass and Play` runs Node engine checks and real Chromium browser suite on the stacked PR.
The first run at `7b93f89` failed only due to iframe sandbox serviceWorker warning in an existing no-page-errors assertion; other tests passed. Test now suppresses only that exact known sandbox message, preserving failures for other errors. **Verify latest PR CI result before calling it passed.**

## Remaining integration work
1. Review functional design from PR #7 (nine-zone interface) and PR #9/#10 (UI and scoreboard) before choosing overlapping design system. No blind cherry-pick.
2. Add private test delivery only after approval; no Pages changes.
3. Design robust stored multiplayer match import/restore, backup, undo, full 6/9 inning flows.
4. Add actual animated runners/fielders and offline-safe assets, keeping visual outcomes explicitly simulated.
5. Validate on user's iPhone; support primary CTAs above fold and save integrity.
6. Review PR #4 Foundation tests before production merge. Preserve V6.3.

## Grok instructions
Review #15 before editing the shared multiplayer UI. Propose separate patch PR for graphical style or accessibility, and link affected files/tests. Do not edit any of these same branch files concurrently without coordinating.

## November 1 — unified nine-zone input integration
- Updated `v7/pass-and-play-ui.js` to expose `aria-pressed` and accessible impact-zone labels, and permit arrow-key navigation across the 3×3 net grid; Enter/Space use the native button click behavior.
- Added real Chromium test in `tests/v7-multiplayer-browser.test.cjs` for 390px viewport, arrow to UC, Enter select, save swing with `zone='UC'`, reset selection, and no horizontal overflow.
- Commit `83d2c80c845ac1b80cbdee91a80be99d131b9105`; check GitHub workflow before declaring test pass.
- This integrates swing-entry behaviors into PR #15; it is not a wholesale merge of PR #7's standalone prototype. Retain Grok review of visuals before combining competing UI prototypes. No production change.

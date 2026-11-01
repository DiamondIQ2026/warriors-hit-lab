# V7 Integration Sprint Handoff — November 1, 2026

## Canonical status
Repo: DiamondIQ2026/warriors-hit-lab. Separate Diamond IQ repository is OUT OF SCOPE.
Do not merge or deploy, change GitHub Pages settings, or access production V6.3 saves without explicit owner approval.

## Open PR dependency map (verified at sprint start)
- #4 Foundation regression tests -> main, draft.
- #5 Standalone flight animation and optional iframe -> main, draft; changes index.html.
- #6 Local multiplayer engine and standalone Dad vs Maddon UI -> main, draft.
- #7 Standalone mobile nine-zone UI -> main, draft.
- #8 Experimental double-tap guard -> main, draft.
- #9 Experimental visual prototype -> main, draft.
- #10 Metallic scoreboard -> stacked on #9, draft.
- #11 Base-running tests -> main, draft (contains experimental visual prototype files).
- #12 Extra scoring matrix -> stacked on #11, draft.
- #13 CPU run cap and regression package -> stacked on #12, draft.
- #14 Accessible above-fold multiplayer handoff -> stacked on #6, draft.

## This integration sprint's tangible changes
PR #14: branch `chatgpt/v7-multiplayer-integration-sprint`, base `chatgpt/v7-pass-and-play-engine`.
- `v7/multiplayer.html`: Pass-phone prompt is a genuine keyboard-operable button directly under scoreboard, reducing above-fold CTA burden on mobile.
- `v7/pass-and-play-ui.js`: disable prompt after final game while preserving existing match state.
- `tests/v7-multiplayer-browser.test.cjs`: tests keyboard Enter handoff at 375px viewport; verifies prompt location/no horizontal overflow and rapid duplicate click counts one swing.
- `.github/workflows/hitlab-v7-multiplayer.yml`: allow CI for stacked PR targeting multiplayer branch. Check current Actions result before claiming green.
- No main, Pages, solo saves, or Diamond IQ changes.

## Merge order and overlap
Review #4 first for save protections. Review #6 before #14 (stacked), and #9 before #10. #11-#13 require individual review of stacked dependency order; #11 contains overlapping experimental HTML with #9, so do not merge blindly. #5 and #6 do not directly overlap file paths but their app integration may conflict with each other, #7, and #9. Prefer a **dedicated integration branch after reviews** with regression tests, not direct main changes. Do not count 13 deliverables accepted simply because draft tests pass.

## Grok's next independent work
1. Review PR #14 for pass-phone discoverability, keyboard access, iPhone CTA placement.
2. Propose visual specification and CSS-only polish without editing #14 branch concurrently.
3. Review #7/#9/#10 UI approaches and recommend one design source rather than merging overlapping approaches.
4. Add regression cases for 6/9 inning multiplayer, final walk-off, extra innings and save-reload on a separate branch.

## Open integration questions
- Decide whether V7 interactive model should replace or supplement V6.3 solo UI; preserve career save identifiers.
- Decide whether outcome generation for multiplayer uses a shared simulated-game adapter; current multiplayer prototype allows manual outcome selection for QA.
- Final staging URL / private playtest approval is still required before any deployment.

## November 1 follow-up — verified integration QA
- PR #14 multiplayer workflow passed (previous pending status resolved).
- Added browser tests at commit `02cea211f782b9bee7adaa121d55d78e23ee9547` verifying custom profile names, left/right handedness, team names and all nine lineup names remain saved after reload; an existing `warriors-hit-lab-v4` sentinel is byte-for-byte unchanged.
- Invalid one-player lineup displays an error and creates no prototype save.
- GitHub Actions `Hit Lab - V7 Pass and Play` workflow passed on this commit.
- Still draft. No visual merge with PR #5/#7/#9, no iPhone physical-device validation, no deployment.

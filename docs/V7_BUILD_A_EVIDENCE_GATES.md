# Build A V7 — Evidence-Based Visual and Asset Gate

## Review basis
- Source: `docs/V7_GAMEPLAY_FIGMA_VISUAL_GAP_REVIEW.md` compares actual Figma Gameplay node `3:5791` (390×1314) against earlier 390px and 375px Playwright preview captures.
- The earlier review explicitly concluded **visual parity NOT achieved**. The screenshots were not state-matched, so they cannot be used as a pixel-diff baseline.
- Current PR #73 passes CI; automated DOM/browser testing does **not** invalidate these visual blockers.

## Confirmed gaps requiring design acceptance
1. Current Family Rivalry screen in `v7/multiplayer.html` still uses a temporary W placeholder, rather than approved original Tampa Warriors artwork.
2. Family Rivalry game screen has a scorebug, handoff, nine net zones and a skippable iframe ball-flight preview, but no persistent 2D baseball field in its primary gameplay layout. That is a P1 difference from approved V7 visuals.
3. The approved Figma gameplay frame separates real practice controls and simulated results more clearly than the current Family Rivalry prototype. A top-level record-real-swing CTA, handedness controls and distinct simulated-field panel require design integration without altering the game/save contracts.
4. Existing mobile tests check accessibility, navigation, above-fold CTAs and save/resume. They do not establish state-matched visual fidelity or real-device safe-area behavior.

## Asset availability and policy
- Repo tree for PR #73 contains `icon.svg` but no verified official Tampa Warriors logo file; `v7/multiplayer.html` labels its W as a temporary placeholder.
- The ChatGPT file library has a candidate image titled **Tampa Warriors Interlocking Emblem.png**, but matching title is insufficient to verify provenance, approval, exact original bytes, or whether it is the correct artwork. Do not treat it as certified, redraw it, or insert it automatically.
- Before integration, obtain explicit identity/provenance confirmation and exact file bytes, then review the resulting visual and accessibility placement on a draft PR.

## Historical save compatibility
- Current V7-generated version-one Family Rivalry saves, CPU snapshots and legacy-shaped generated cases are exercised in inherited tests; these are not authentic old user save exports. Do not claim actual historical compatibility until original older snapshots can be restored on a throwaway development origin, with zero writes to production or V6.3.

## Next independently useful work
- Capture the same game state and mobile viewport from Figma and current V7 UI; perform a visual diff with approved assets before altering gameplay layout.
- Make the 2D field and real-practice/simulated-result separation an explicit P1 design review; keep `#turn`, `#record`, nine-zone IDs, save keys and original schemas intact.
- Verify candidate original logo through user approval and byte-level provenance before use.
- Retain draft status for stacked PRs; no merge or deploy is implied by passing CI.

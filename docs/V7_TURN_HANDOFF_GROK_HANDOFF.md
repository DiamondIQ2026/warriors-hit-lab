# V7 pass-the-phone preview isolation — Grok handoff (2026-11-01)

Repository: DiamondIQ2026/warriors-hit-lab, NOT Diamond IQ.
Stacked draft PR #17 on #16, which stacks on #15/#14/#6. Do not merge or deploy without owner approval.

## Problem fixed
Previous hitter's simulated ball-flight replay remained visible when the next team was prompted to take the phone. This could confuse the new hitter and expose previous turn context.

## Changes
- `v7/pass-and-play-ui.js`: whenever `currentTurn` token (player, inning, half) changes, reset handoff acknowledgment and hide/invalidate the preceding flight preview. Close any open preview iframe and remove its src. Starting a new match clears stale result text.
- `tests/v7-multiplayer-browser.test.cjs`: three-out Chromium handoff asserts preview hidden, URL cleared, iframe unloaded, stored match unchanged by acknowledgment; next team records its own swing.
- CI workflow includes stacked PR #16 as a target.
- No changes to engine outcomes, solo career save schema, production, Pages settings, or the separate Diamond IQ project.

## Follow-up for Grok
Review UI state during team handoff and watch for stale outcome labels after an inning transition. Design a full-screen handoff interstitial when the V7 UI direction is approved. Keep all major CTAs above the fold. Add phone-device testing and multi-inning acceptance cases. Preserve exact official team logo only if source asset bytes are accessible.

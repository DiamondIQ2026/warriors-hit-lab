# V7 Build 1 — Complete Gameplay Experience

Status: **Integration in progress, no release approval** (November 2, 2026).

## Integration base and verified dependencies

Integration branch: `chatgpt/v7-milestone1-gameplay-integration-20261102`, rooted in draft PR #127 (Chromium/WebKit result-review and V6.3 sentinel coverage), which includes the sequential mobile UI chain #118–#126. All are draft-only.

| Workstream | Draft PRs | Integration action |
| --- | --- | --- |
| Mobile visual / tee practice / result review | #117–#127 | Base includes #118–#127; #117/#121 belong to scoreboard sibling chain and must be reconciled separately |
| Game state / save guards / end game | #108, #112, #114, #116, #122, #129 | Independent chain; verify file diffs and reconcile before incorporating; do not blindly merge onto UI |
| Skill-first / runner regression | #110, #128 | Independent QA siblings; reuse verified coverage after reconciling branch bases |
| Training Academy | #98, #100, #103, #105, #107, #109 | Separate milestone; ensure session keys and V6.3 saves remain isolated |

Latest verified CI results at audit: #127, #128 and #129 successful individually. **Combined CI has not yet been verified.**

## Build 1 acceptance gate

- Complete a game from setup through a scored result and full innings on a phone-sized viewport.
- Real tee swing required for game result; the 3×3 zone and contact quality stay logically separate from **simulated** baseball result.
- Pass-phone turn acknowledgment and reload must not double-credit swings or mutate prior saves.
- Correct inning, outs, base runners, walkoffs, and final score without stale inputs.
- Persistent mobile navigation, the two accessible Record Swing CTAs, recent-swing review, and safe restore state.
- Run Chromium and WebKit checks at 375×812 and 390×844 as available; capture gameplay screenshots after integrated CI.
- Preserve the existing V6.3 career/saves and unrelated app keys.
- Explicit user approval before any merge into main or any deployment.

## Safe integration sequence

1. Preserve the Build 1 UI baseline (#127), add full-workflow regression and integration manifest in this draft PR.
2. Inspect relevant files and diffs from #129, #128, and scoreboard #121. Resolve overlaps deliberately in a separate integration checkpoint; never overwrite one branch's changes with another.
3. Run the whole CI matrix after each combined checkpoint, inspect 375px/390px screenshots, fix regressions.
4. Demonstrate a full playable 3-inning game and save/resume before requesting review.
5. Leave training Academy integration, seasons/tournaments, and final Figma parity to subsequent milestones.

## Coordination guardrail

All scheduled agents should **favor larger milestone units**, communicate through PR descriptions and tests, and avoid repeated small layout-only PRs. All modifications are draft-only in `DiamondIQ2026/warriors-hit-lab`; never modify Diamond IQ, production, main, Pages, V6.3 or official logo assets.

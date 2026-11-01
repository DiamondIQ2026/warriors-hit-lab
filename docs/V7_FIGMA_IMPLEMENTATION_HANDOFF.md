# Warriors Hit Lab V7 — Figma-to-GitHub implementation handoff

Status: DESIGN MAPPED / NOT IMPLEMENTED / NOT APPROVED. This document is a non-production coordination artifact.

## Shared source of truth
[Hit Lab Development HQ — Figma Implementation Queue](https://docs.google.com/spreadsheets/d/12MovQ2j6bLqE-qsqr6qMBqO5SwcMhZETQi4Vj0MF0I4/edit#gid=22380014)

Figma file key: `pBlRS27xA7VWvSnPnvHbiC`.
The actual Figma design-context interface was accessed directly for both frames. Figma generated visual guidance; it is not proof of full gameplay correctness or user design acceptance. Do not recreate the exact Tampa Warriors official logo from placeholders.

## UI-001 Gameplay — design node `3:5791`
[Open verified frame](https://www.figma.com/design/pBlRS27xA7VWvSnPnvHbiC/Warriors-Hit-Lab-V7--Official-UI-Design?node-id=3-5791)

Confirmed details: 390px mobile canvas, dark navy `#080F1C`, red `#CF3541`, white `#F5F7FB`, Inter typography, primary **Record real swing** button located before the large practice-input panel, handedness segmented control, nine numbered batting zones, persistent navigation. Design has a placeholder W mark; do not treat it as the official logo.

Backlog: HL-003, HL-004, HL-006, HL-009. Existing experimental overlapping stacked draft PRs: #15, #16, #17 (inspect exact current branch and base relationships before modifying anything).
Acceptance: 375px/390px browser rendering, no horizontal overflow, touch accessibility, clearly differentiated real-swing vs simulated-game counts, three-out handoff and reload regression, accurate Figma parity review and real iPhone test.

## UI-002 Team Management — design node `3:6244`
[Open verified frame](https://www.figma.com/design/pBlRS27xA7VWvSnPnvHbiC/Warriors-Hit-Lab-V7--Official-UI-Design?node-id=3-6244)

Confirmed details: 390px mobile canvas, same dark navy/red/white palette and Inter typography, editable player-profile fields, L/R batting-handedness selector, ordered lineup rows with reorder handles, player selection, add-player concept, persistent navigation. The add-player control is a design concept; V6.3 currently assumes nine lineup players and MUST NOT implement variable roster size until the game rules and save migration specifications are decided and tested.

Backlog: HL-005, HL-013. Existing candidate draft branches #14/#15/#17 (verify real code; do not assume any is merged).
Acceptance: persistent player IDs, roster names/attributes/stats unchanged on load/reload, profile hand isolation, lineup order persistence, accessible reorder controls, keyboard/mobile input behavior, old saved careers untouched, no destructive career migration.

## Build sequence and safety
1. Confirm latest PR branch, tests and dependencies for the chosen screen. Avoid overlapping changes across stacked PRs.
2. Read the precise Figma frame and child-node design context; verify any current design revisions. This document is intentionally a summary.
3. Implement the smallest isolated, interactive slice in a NEW V7 draft branch with testable acceptance criteria and review screenshots, rather than copying static Figma markup blindly.
4. Run Node/browser validations and log evidence with source SHA, Figma node, PR URL and pending real iPhone QA.
5. Leave `main`, V6.3 current release and any `warriors-hit-lab-v4` keys untouched. Do not modify the separate Diamond IQ project or GitHub Pages settings. No merge or deploy without owner approval.

Independent Claude review is read-only and may require manual initiation on a free plan. A GitHub review packet is not itself proof Claude examined it.

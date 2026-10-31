# Warriors Hit Lab V7 — Mobile Swing Entry Handoff
Date: 2026-10-31
Repository: `DiamondIQ2026/warriors-hit-lab` (never edit Diamond IQ)
Branch: `chatgpt/v7-mobile-swing-entry-prototype`
Draft PR: https://github.com/DiamondIQ2026/warriors-hit-lab/pull/7
Tracker: HL-003

## Completed scope
- `v7/swing-entry.html`: responsive standalone mobile-first screen with 3×3 physical net zones, self-reported contact buttons, handedness, in-memory practice counter, undo and status announcements.
- `v7/swing-entry.js`: no imports, no production dependencies, no storage reads/writes, no gameplay outcomes; keyboard arrow navigation across zones; prevents duplicate records by clearing selections after every swing.
- `tests/v7-swing-entry-browser.test.cjs`: Chromium tests at 375px and 393px for tap selection, aria state, hard-contact logging, no horizontal overflow, undo and V6.3 localStorage sentinel preservation; desktop keyboard test.
- `.github/workflows/hitlab-v7-swing-entry.yml`: PR-triggered syntax + Chromium CI.

## Boundaries and design choices
- Prototype is **not** imported into `index.html` and is not deployed.
- The nine zones are physical net positions from the hitter's perspective; handedness does not silently mirror the physical target.
- Contact is **self-reported**, not measured. It is a real practice observation, not a simulated hit/out, and must not change batting averages or baseball score.
- Prototype session is intentionally ephemeral; no existing career save or localStorage keys are accessed.
- Real V6.3 saves must be backed up and existing Quick Play/Season/Tournament regressions rerun before integrating any V7 interface.

## Remaining acceptance work
1. Review design on actual iPhone at 375×667 and 393×852 equivalents; test one-handed use, screen reader, landscape and accessibility settings.
2. Define integration adapter to current V6.3 swing-entry event without changing existing scoring or career schema.
3. Test saved career reload, undo and game progression with the integrated UI.
4. Add regression for rapid double tap and handedness switch after zone selection.
5. Obtain user approval before merging or deploying. **HL-003 remains In progress** until integration and acceptance.

## Grok / Cursor handoff
Review this PR and test evidence before implementing overlapping UI work. Avoid concurrent edits to these files. Suggested independent task: design mobile visual refinements and accessibility QA; report suggested changes or open a separate PR. Never edit Diamond IQ, merge, deploy, or alter real saves.

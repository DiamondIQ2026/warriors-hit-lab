# V7 Gameplay — Figma visual comparison
Status: Visual review completed; parity NOT achieved. Source branch is stacked draft PR #27 on PR #17. No deploy/merge approval.

## Compared evidence
- Figma Gameplay node `3:5791`, native frame 390×1314 (direct screenshot inspected).
- GitHub Actions run 41348955414, artifact `v7-gameplay-mobile-captures`: Playwright gameplay screenshot 390×1333 (visually inspected) and 375×1352 (captured, not independently inspected).
- Both images are full-page captures, *not* same application state or pixel-perfect screen pairs. Figma shows a season-mode Warriors vs Rivals example; prototype shows local Dad vs Maddon test at top of first inning.

## Verified visual gaps
| Area | Figma reference | PR #27 screenshot | Priority | Safe next step |
|---|---|---|---|---|
| Header/navigation | Compact branded W placeholder and player avatar; six-destination bottom navigation | Large Dad vs Maddon development heading; no persistent bottom nav | P1 | Introduce reusable V7 shell in a new isolated UI slice, retain current gameplay DOM IDs |
| Practice CTA | **Record real swing** placed before practice panel | **Record swing** inside gameplay panel below metallic scoreboard and turn banner | P1 | Separate top-level practice entry from in-game submit without confusing save/scoring effects |
| Practice card | LIVE INPUT badge, practice count, L/R segmented switch, 3×3 zone grid, practice stats | Practice note and numbered grid; L/R only in match setup | P1 | Profile-aware handedness control using existing profile state; no schema migration |
| Simulation panel | Distinct `SIMULATED GAME · NOT REAL STATS` module with metallic score and 2D field | Combined scoreboard above practice form, no 2D field in primary gameplay layout | P1 | Extract simulated module; embed existing skippable field preview only after event/safety review |
| Stats | Separate recorded swings/solid contacts and simulated play result | Real swing count and manual simulated outcome select | P1 | Retain real/simulated distinction without inventing metrics |
| Design system | #080F1C background; #CF3541 CTA; Inter font; compact cards and 390px mobile nav | Palette aligned in parts; system-ui and different spacing; scoreboard already metallic | P2 | Use design tokens and prioritize above-fold action; check assets exactness |
| Zones | 1–9 grid with center selected and accessible state | Numeric 1–9 grid and center selected, but rectangular buttons with different height and spacing | P2 | Match 48px cell geometry *only if* touch targets remain at least 44px |

## Important constraints
- Do NOT copy sample user names/stats/season results from Figma into game logic; these are design placeholders.
- Do NOT replace or fabricate the official Tampa Warriors logo. The Figma W is a placeholder.
- Current PR #27 browser CI validates a local multiplayer prototype, not Figma visual parity.
- Do NOT overwrite V6.3 saves, production Pages, main gameplay or separate Diamond IQ.
- Implement smallest safe UI components on draft branches, run existing 25-test regression suite and new screenshot capture.
- Owner must review visual acceptance on real phone prior to any release.

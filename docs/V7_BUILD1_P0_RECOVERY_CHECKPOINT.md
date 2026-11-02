# Build 1 — P0 recovery checkpoint (draft only)

Baseline: PR #147 commit 79682b5fdeb16f3e4908b93eb194b1a22c0d909c, stacked on #146 and milestone PR #130. This document is an assignment/checkpoint, NOT an implemented fix or CI acceptance.

## Blocking acceptance tests
1. **Skill-derived outcomes**: inspect Family Rivalry result-selection logic; design a pure, seeded resolver taking impact zone, contact quality, batter handedness and game context. Assert repeatability, input sensitivity, and separate real-rep versus simulated-outcome accounting. Do not silently replace existing game behavior or modify real saves.
2. **Real tee rep continuity**: test starting game A, recording a quality swing that simulates an out, ending game A, then starting game B. Specify whether cross-game lifetime reps are required; current per-game counters must not be mistaken for a durable ledger. Avoid save schema changes until owner approval and backup/restore tests.
3. **CPU corrupt-save recovery**: add malformed JSON, wrong-shape payload, future schema, and unavailable-storage fixtures; require non-destructive, export-first recovery. Never overwrite an unrecognized saved record.
4. **Short viewport**: reproduce reported 375x667 sticky-navigation / Record Swing obstruction with Chromium and WebKit Playwright. Assert visible, unobstructed, enabled controls and no horizontal overflow at 375x667, 375x812 and 390x844.
5. **Full game**: 3/6/9 innings, extra innings, pass-phone handoffs, actual stadium flight, undo/reload and endgame; run combined Chromium/WebKit tests on the SAME head. Preserve synthetic legacy key bytes; physical Safari and authentic V6.3 backup restoration remain separate acceptance gates.

## Branch coordination
- #146 and #147 touch the same flight integration test; use #147 as the current combined baseline, not a blind cherry-pick.
- #121 scoreboard and #129 experimental UI remain separate until diff review and combined regression tests.
- Gameplay Figma node 3:5791 is reference-only, not visual acceptance.
- No merge, deploy, main, Pages, Diamond IQ, official logo, V6.3 save or production modification.

Status: checkpoint documented; fixes and test execution pending.

# V7 Local Multiplayer — Grok Handoff (2026-10-31)

## Ownership and source of truth
Repository: `DiamondIQ2026/warriors-hit-lab` ONLY. **Never change DiamondIQ.**
ChatGPT leads integration, tests and roadmap; Grok can implement visual/interface work or review after becoming available. GitHub draft PR and Development HQ log are authoritative. No merging/deployment without project owner's approval.

## Current branches and dependency
- PR #4: `chatgpt/v7-baseline-safety-tests` — baseline and Chromium save/gameplay regression suite; still draft, not merged.
- PR #5: `chatgpt/v7-gameplay-foundation` — optional skippable embedded simulated 2D flight visualization; still draft, not merged.
- New branch: `chatgpt/v7-pass-and-play-engine` based on `main` to avoid mixing unapproved work.

## Current work and exact code
- `v7/pass-and-play.cjs`: pure, deterministic, **local two-human** match engine; independent nine-batter lineup and hand per profile, alternates offense after three outs, 3/6/9 inning configuration, base running, regulation/extra innings, home walk-offs, score and at-bat recording.
- `tests/v7-pass-and-play.test.cjs`: turn rotation, player profiles, bases/score, lineup index, final scoring, extras, persistence serialization and invalid-input contract.
- No import into `index.html`; no changes to existing career save localStorage keys. This is a standalone core for future UI work.
- `realSwings` and `atBats.kind='real-swing'` count recorded physical reps; baseball outcomes remain **simulated**. Do not label simulated batting results as measured mechanics.

## Decisions and scope
- Profiles: Dad / Tampa Titans and Maddon / Tampa Warriors are sample configurations, not hardcoded requirements. Both names, teams, hands and all nine lineup positions must be editable.
- Pass-and-play: phone passes to opposing team after three outs; preserve per-team player identity, lineup and statistics.
- Home team is given as first argument to `newMatch(home,away,innings)`; away hits in top half.
- Match engine is intentionally deterministic: callers supply outcome, rather than secretly rolling probabilities. A future adapter can call the existing Hit Lab outcome engine, but needs a clearly defined seam.
- Player's V6.3 production career data must not be overwritten. V7 multiplayer saves should use a separate versioned key and verified migration/backup flow.

## Acceptance tests still needed
1. Browser-based pass-and-play interaction and mobile viewport QA with clearly identified active team.
2. Persistent separate multiplayer profile and match save; reload exactly resumes runners/outs/half-inning.
3. Tests for home lead after top of regulation, walk-off, tied extras, end-of-game, undo and accidental double-tap.
4. Score fairness and deterministic test fixtures; multiple sample games.
5. Distinguish training swings versus *simulated game stats* in both UI and exports.
6. Review/save protection and full existing Quick Play/Season/Tournament regression before any merge.

## Next work Grok can take without conflicts
- Develop a **separate UI prototype** using exported `createProfile/newMatch/recordSwing/currentTurn` contract. Avoid editing this engine concurrently; submit independent PR against separate branch.
- Design responsive match setup, profile/lineup editor, scoreboard, and explicit 'PASS PHONE TO' screen.
- Test on iPhone-scale viewport and run GitHub CI.
- Leave implementation notes and open questions in the same PR and Development HQ.

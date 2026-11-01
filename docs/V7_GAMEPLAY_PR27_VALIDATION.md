# PR #27 — Gameplay validation status

Verified against feature branch `chatgpt/v7-figma-gameplay-clarity-20261101`.

## Source-level checks (10/10 passed)

- Background and primary surface Figma colors are present.
- All preexisting gameplay DOM ID hooks remain present.
- A real-practice explanation differentiates physical contact from simulated outcome.
- Record CTA appears in the source before the nine-zone grid.
- User-visible zone labels are 1–9.
- Internally stored zone codes remain UL/UC/UR/ML/MC/MR/LL/LC/LR.
- Selected-zone `aria-pressed` state logic is retained.
- Generic touch controls have 44px minimum height.
- Mobile fields use 16px fonts.
- Zone grid has an accessible group label.

These are **source inspections**, not an executed browser suite, a complete runtime test, or pixel-accurate Figma comparison.

## Automated test command

With the full feature branch checked out in a Node environment, run:

```bash
node --test tests/v7-figma-gameplay-clarity.test.cjs
```

Then run the existing V7 multiplayer and turn-handoff regressions present on the branch and capture output.

## GitHub CI limitation

As of this handoff, no GitHub Actions runs were returned for PR #27's previous feature-branch commits. This draft is stacked on PR #17's development branch, which predates the CI workflows now installed on `main`. Do not label GitHub CI green until a run is actually observed on the relevant commit, and do not retarget PR #27 to main just to get a check if doing so mixes unrelated stacked changes.

## Required pre-merge acceptance

1. Run automated Node checks on the exact head commit.
2. Browser check at 375x812 and 390x844 with no horizontal overflow and primary CTA before nine-zone entry.
3. Test game start, nine impact selections, 3-out handoff, record swing, simulated outcomes and reload behavior.
4. Verify separate V7 prototype save key and no writes to existing V6.3 career.
5. Compare a 390px runtime screenshot with Figma Gameplay node 3:5791.
6. Obtain owner design acceptance. Never merge or deploy without explicit owner approval.

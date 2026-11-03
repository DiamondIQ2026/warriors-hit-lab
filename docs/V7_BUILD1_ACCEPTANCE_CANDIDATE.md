# Warriors Hit Lab V7 — Build 1 mobile acceptance candidate

Status: **draft / not approved for merge or deployment**. Integration candidate branch `chatgpt/v7-build1-acceptance-candidate-20261102`.

## Integrated feature chain

This branch inherits the V7 Milestone 1 gameplay branch through draft PRs #158–#163, including:
- deterministic real tee zone/contact → simulated game outcomes with handedness;
- 3/6/9-inning Family Rivalry, pass-phone acknowledgment, outs, baserunners, scoring, walkoffs and save replay validation;
- mobile live box score with inning totals, hits, outs;
- lineup batting statistics and batting averages;
- final-game winner/score and standout-hitter recap;
- V7-only save recovery, backup and reload without altering V6.3 career keys.

The chain remains **stacked draft PRs**, not merged. All features are entertainment simulation, not measured ball tracking.

## Integrated acceptance proof

`tests/v7-build1-complete-mobile-acceptance.test.cjs` drives a complete 3-inning game from the **actual browser UI** with 19 recorded real-tee swing actions (one first-inning homer and 18 outs), multiple pass-phone handoffs, a midgame reload, inning/box-score and final recap checks, and a second reload after the game. Runs on Chromium and WebKit at 375×812 and 390×844. Asserts V6.3 and unrelated localStorage sentinels remain byte-exact, and no document horizontal overflow.

The test deliberately uses the QA-only simulated outcome override to force a deterministic final score; production simulation remains zone/contact/handedness driven.

## Acceptance checklist

- [ ] GitHub Actions CI passes on the **exact acceptance branch head**.
- [ ] Chromium and WebKit full mobile 3-inning browser playthrough passes at both viewport sizes.
- [ ] Final score, batter stats, replay integrity and byte-exact save persistence pass.
- [ ] 375/390 mobile screenshot review and visual parity review completed (not claimed by automated text assertions). CI captures game setup, animated-result completion, live stats and final recap at both sizes under the `v7-gameplay-mobile-captures` artifact; inspect the PNGs before checking this gate.
- [ ] Integration lead verifies no conflicting newer gameplay branch and that all intended V7 changes are present.
- [ ] User explicitly approves any merge into main and any deployment.

## Safety and deferred scope

No merges, deployment, production changes, Pages configuration, Diamond IQ repository changes, V6.3 save schema changes or logo recreation. Seasons/tournaments, Training Academy and final Figma parity are outside Build 1.

## Training analytics visual acceptance

The GitHub Actions `v7-gameplay-mobile-captures` artifact now includes `gameplay-training-heatmaps-375x812.png` and `gameplay-training-heatmaps-390x844.png`. These full-page captures show both nine-zone real-tee heatmaps, the recent recorded-swing review, and live score/lineup panels after a deterministic simulated double. Review the small-screen readability, visual hierarchy, legibility of all 18 cells, and distinction between actual practice and simulated results before approving a merge. The capture job asserts both heatmaps exist, a real tee rep was counted, the recent simulated outcome is labeled, and no horizontal overflow occurred. Screenshots are CI artifacts only; they are not a production deployment.

## Integrated tee-training acceptance candidate

The combined draft chain #169–#176 now contains per-player validated tee repetition counts, nine-zone heatmaps, CSV download, configurable per-player practice goals, guided under-practiced zone drills, distinct-zone coverage, and practice milestones. This branch adds a Chromium/WebKit acceptance test at 375×812 and 390×844 that exercises all seven features in a single real gameplay session, exports CSV, changes a practice goal, reloads the game, checks saved match bytes are unchanged, and verifies no horizontal overflow. The mobile CI screenshot capture now asserts the integrated dashboard components are present and reflect one logged tee repetition.

**Release gate:** Review screenshot artifacts, ensure the training panel remains usable on a small phone, verify user-facing copy distinguishes logged practice from simulated outcomes, and obtain explicit approval before merging or deploying. All training metrics are derived from validated game history; no skill, launch angle, or exit velocity is inferred.

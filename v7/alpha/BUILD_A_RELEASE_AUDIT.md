# V7 Build A — Release Readiness Audit (Draft)

## Automated checks on the stacked branch
- PR #69 workflow 41373275106 completed successfully. The inherited suites exercise CPU and Family Rivalry batting, mobile CTA placement, nine zones, game completion, extra innings, handoffs, and mode-specific reload.
- This is a development-only prototype. A green CI run does not establish production readiness, complete visual parity, real-device performance, or the absence of defects.

## Release blockers and manual approval gates
1. **Official branding:** `v7/multiplayer.html` still explicitly displays a temporary W placeholder. Do not replace it with synthetic or recreated art. The original exact user-approved logo asset must be located and integrated before visual signoff.
2. **Visual design fidelity:** Compare actual 375px and wider screenshots of the CPU field, metallic scorebug, bottom navigation, Family Rivalry handoff, and training screens with the original approved V7 mockups. CSS assertions do not prove pixel parity.
3. **Real-device acceptance:** Test touch input, safe areas, screen-reader narration, focus order, reduced-motion behavior, and back/forward navigation on at least one iOS and one Android device.
4. **Gameplay acceptance:** Existing browser tests prove selected final-out, walkoff, and extra-inning paths, not exhaustive nine-inning gameplay or every score/runner combination. Exercise complete game flows and tie-breaking in both modes.
5. **Save upgrades:** Keep CPU key `hitlab-v7-visual-prototype-only` and Family Rivalry key `warriors-hit-lab-v7-multiplayer-prototype` isolated. Validate restoration from representative older saved examples before approving any future schema migration. Never modify V6.3 saves.
6. **Branch integration:** These are stacked draft PRs. Review dependency order and cumulative diff; passing branch CI does not authorize merge, deployment, changes to `main`, or GitHub Pages.

## Release decision
**Not ready for production approval** until manual checks and branding are completed and reviewed. No automatic merge or deployment is authorized.

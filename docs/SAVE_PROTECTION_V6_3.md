# Warriors Hit Lab V6.3: Save Protection and Backup Guide

> Baseline documentation for V7-001 / Issue #2. No player data is stored in GitHub.

## Before testing any V7 preview

1. Open the **current live game on the same device and browser** that holds the player's career.
2. Open **Settings** and select **EXPORT SAVE**.
3. Save the downloaded `warriors-hit-lab-save.json` in a safe location outside the browser (for example, a personal drive). Make a second copy if possible.
4. Confirm the downloaded file exists and is nonempty. Do **not** post the JSON publicly or attach it to a public issue/PR.
5. Do not clear site data, uninstall the PWA, reset progress, or import another save on the main device while testing.
6. Use a separate browser profile or test device for import testing. Importing replaces the current save.

## Save contracts observed in V6.3 source

| Storage item | Key | Purpose |
| --- | --- | --- |
| Current career | `warriors-hit-lab-v4` | Main saved state |
| Earlier save | `warriors-hit-lab-v3` | Legacy fallback during initialization |
| Old career | `warriors-hit-lab-career-v2` | Special migration path |
| Recovery snapshot | `warriors-hit-lab-v6-snapshot` | Previous saved state on selected completed-game saves |

The **app version label V6.3 is not the same as the storage schema version**: the current `version` field is 4. Do not rename keys or bump schema versions without a migration plan.

The current source's `valid(o)` function accepts records with version 3 or 4 if required fields are present. That is a basic shape check, **not** proof that every historic file or a future migration succeeds.

## Restore procedure (only on a safe test profile/device)

1. Export and independently keep the test profile's existing save first, if there is one.
2. Open Settings → **IMPORT SAVE** and select your backup JSON.
3. Confirm the replacement action only when working on the test profile.
4. Check the team's name, career totals, mode progress, season/tournament details, and saved game state.
5. Close and reopen the game in the same test profile to confirm persistence.
6. If the file fails validation, stop. Do not reset or overwrite the original device.

## Release gate for V7

- A representative **synthetic** V6.3 JSON save fixture is needed; never upload a real child's private save.
- Test export/import round trips on an isolated browser profile.
- Test Quick Play, Season, Tournament, career stats and in-progress game resumption.
- Check that old records remain intact after migration and after app restart.
- Obtain explicit approval before merging gameplay or migration changes to `main`.

## Automated test scope

`tests/baseline.test.cjs` checks source contracts, basic validator behavior, and syntax without running the game or touching browser storage. It does **not** yet implement end-to-end browser save/load tests or a complete V3/V2 migration test. Those remain open in Issue #2.

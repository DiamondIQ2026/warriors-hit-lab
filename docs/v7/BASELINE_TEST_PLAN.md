# Baseline test plan (lock V6.3 before any V7 behavior change)

These tests are the gate in front of V7. They describe **today's** rules, including the bugs the inventory lists. A test that "fixes" the tournament tie or the governor is not a baseline test. It is a product change and needs an owner decision.

No test in this plan deploys the site. No test pushes to `main`.

The harness is new files. It does not edit `index.html` to make itself easier. The engine under test is the script inside `index.html` at `489ccf8` until the extraction PR replaces that entry with modules and the same tests stay green.

## Tooling

| Piece | Choice | Why |
|---|---|---|
| Package | `package.json` at the repo root, committed on the foundation branch, not on `main` | The live Pages site stays the five raw files |
| Dev server | Vite, `base: './'` | Relative URLs match project Pages (`/warriors-hit-lab/`). Vite is the build the implementation plan uses, so the tests and the later bundle share one runner |
| Unit tests | Vitest, node environment, plus jsdom only for DOM tests | Fast, seeded, no browser required for the engine |
| Browser tests | Playwright | The viewports below are set in the test, not assumed from a device preset |
| Worker tests | Vitest calling the worker with a fake `caches` / `fetch`, and one Playwright case on HTTPS | `index.html` registers the worker only when `location.protocol === 'https:'`. An `http://localhost` preview will skip registration and a naive test will pass without checking anything |
| CI | GitHub Actions, `pull_request` and `workflow_dispatch` only | `permissions: contents: read`. No `pages: write`. No deploy job, no `peaceiris/actions-gh-pages`, no `actions/deploy-pages`, no push to `main` |

Playwright viewports, in CSS pixels, `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true`:

| Name in the suite | Size | Note |
|---|---|---|
| `se` | 375 × 667 | Current iPhone SE logical size. Playwright's built-in device named "iPhone SE" is the old 320 × 568 phone. Do not use that preset |
| `iphone15` | 393 × 852 | iPhone 15 logical size |

Node 22 is what this audit used (`node --check` on the extracted IIFE: syntax ok). CI should pin Node 22.

Suggested scripts, names only: `test` (Vitest), `test:e2e` (Playwright), `test:offline` (HTTPS Playwright), `check` (all three). `preview` serves the built or the raw file for e2e. The raw-file preview is the one that must pass **before** the extraction changes any behavior.

## How the unit harness loads the engine

1. Read `index.html`, slice the IIFE between `<script>` and `</script>`.
2. Run it in a VM with a stub `document` (the ids the script touches), a memory `localStorage`, stub `confirm` that returns true or false as the test chooses, and stub `speechSynthesis` / `AudioContext`.
3. Replace `Math.random` **before** the IIFE runs, or wrap the global the IIFE closes over. The IIFE calls `Math.random` through the global object inside `rand` and `outcome`, so a stub installed first is enough. Do not edit the source to add a parameter until the extraction PR, and then keep this stub working.
4. Export the closure's functions by evaluating a small trailer **in the test harness only**, for example by patching the source string in memory to attach `outcome`, `baserun`, `swing`, `finishGame`, `valid`, and `d` onto a test global. That patch lives in the test file, never in `index.html`.

After extraction, the trailer goes away and the tests import the modules. Assertions stay the same.

### Seeded RNG

Tests that need an exact at-bat use a scripted queue:

```js
function scripted(draws) {
  let i = 0;
  return () => {
    if (i >= draws.length) throw new Error("scripted RNG underrun");
    return draws[i++];
  };
}
```

`draws` are values in `[0, 1)`, matching `Math.random`. A second helper, `mulberry32(seed)`, is for replay tests that care about "the same seed, the same game," not for the golden table. Golden rows should depend on the queue, so they survive the later swap from `Math.random` to `mulberry32`.

`describe`'s out sentences call `pick` → `rand` → `Math.random`. Any assertion on an out's log text must include that extra draw. Hit sentences do not.

## 1. Engine golden tests

Install a profile and the default roster (or a batter whose ratings are set in the test) before calling `outcome`. Default style is arcade unless the row says balanced.

### `outcome` given a batter and a queue

Use batter `{ hand: 'R', contact: 75, power: 75, speed: 65, clutch: 70 }` unless noted. Contact 75, clutch 70, and speed 65 are the zeros of those formulas. Power 75 makes `powerFactor = 45/69`.

Each row is the first draws `outcome` will pull. Assert the returned string.

| Case | Zone | Power | Style | Context | Draws | Expect |
|---|---|---|---|---|---|---|
| Hard middle-middle is a hit when the roll is under the chance | `MC` | hard | arcade | no game | `[0.50]` | not an out. Chance is `0.60+0.06+0.095 = 0.755`, so `0.50` is a hit and a second draw is required. Put the second draw at `0.99` and expect `single` (`extra` for this batter is `0.31 + (45/69)*0.24 ≈ 0.466`) |
| Hard middle-middle is an out on a high roll | `MC` | hard | arcade | no game | `[0.90]` | `out` |
| Lower row is worse than middle | `LL` | hard | arcade | no game | `[0.59]` | `out`. Chance is `0.60-0.02 = 0.58` |
| The same roll is a hit on the middle row | `ML` | hard | arcade | no game | `[0.59]` | hit, then a second draw. `0.59 < 0.66` |
| MC stacks on the middle row | `MC` vs `ML` | hard | arcade | no game | same first draw `0.70` | `ML` is an out (`0.70 >= 0.66`). `MC` is a hit (`0.70 < 0.755`). This is the middle-middle bonus |
| Pull side, right-handed | `ML` | hard | arcade | no game | `[0.67]` | hit. Chance is `0.66+0.015 = 0.675`. `MR` with the same draw is an out |
| Pull side, left-handed | `MR` | hard | arcade | no game | `[0.67]` | hit. `ML` with the same draw is an out |
| Center column is not a pull | `MC` | hard | arcade | no game | | no `+0.015` |
| Soft contact cannot be a homer | `UC` | soft | arcade | no game | `[0.01, 0.00]` | not `homer`. The homer window is 0. The low second roll is a triple or a double, not a homer |
| Balanced pays −0.09 and then the floor | `LL` | soft | balanced | no game | `[0.06]` then a second draw | `hit`, not `out`. Raw chance is `0.16 − 0.02 − 0.09 = 0.05`, which the floor raises to `0.07`. `0.06 < 0.07`, so the swing is a hit. The draw `[0.08]` is an out. Also assert a hard `MC` balanced chance is `min(0.76, 0.755 − 0.09)` |
| Arcade ceiling | contact 99, clutch 99, hard, `UC`, pull, trailing by 20 in a late inning | | arcade | | a roll of `0.849` | hit. A roll of `0.851` is an out. The ceiling is `0.85` |
| Late boost only when trailing in the late window | 3-inning game, inning 2, down 1, clutch 70, hard, `UL`, contact 75 | | arcade | | | chance is higher than the no-game `UL` hard chance by `min(0.14, 0.055+0.012)` |
| Late boost does not apply when ahead | same, but score ahead | | arcade | | | chance equals the no-context chance |
| Unknown style | `style: 'other'` | hard | | | | ceiling `0.76`, and the −0.09 is **not** applied |

Compute the expected chances in the test from the formula comments in `ARCHITECTURE.md`, not by pasting magic numbers without a comment. When a formula and a test disagree, the code wins until the owner changes the code. The test is there to catch a drift, so write the expected value as an expression (`0.6 + 0.06 + 0.095`) rather than a rounded float copied from a console log.

Extra-base rows, same batter, first draw low enough to be a hit, second draw varied:

- second draw `>= extra` → `single`
- second draw `< homer window` → `homer` for hard and medium, never for soft
- a draw between the homer window and `homer + 0.055` → `triple` when speed is 65
- speed 99 widens the triple window by `34 * 0.00035`
- a draw above that and below `extra` → `double`

### Governor

Build a game with `inningRuns` set, call `swing` with a scripted `outcome` that would return `single` (or stub the draws so `outcome` returns a hit), and assert the stored kind.

| `inningRuns` before the swing | Inning vs scheduled | Score vs opponent | Draw for the governor | Stored kind |
|---|---|---|---|---|
| 2 | any | any | (no governor draw) | the hit |
| 3 | inning 1 of 9 | ahead | `0.33` | out (`0.34`) |
| 3 | same | ahead | `0.34` | the hit |
| 4 | same | ahead | `0.69` | out (`0.70`) |
| 5 | same | ahead | `0.91` | out (`0.92`) |
| 5 | inning === innings | tied | `0.00` | the hit. No governor draw is consumed |
| 5 | inning === innings | behind | `0.00` | the hit |
| 5 | inning > innings (extras) | tied | `0.00` | the hit |
| 5 | inning === innings | ahead | `0.00` | out |

Also assert that after a governed out, `practice.history` last entry still has the tapped zone and power, `d.zones[zone]` increased, and `stats.h` did not.

### `baserun`

Pure. No RNG. For each kind `single`, `double`, `triple`, `homer` and each of the 8 base states, assert `runs` and `next`. Spot checks that must be in the suite:

- empty bases, single → 0 runs, runner on first only
- bases loaded, single → 1 run, bases still loaded
- bases loaded, double → 2 runs, runner on second only
- runner on first only, double → 0 runs, runners on second and third (`next` is `[false, true, true]`). The runner from first advances exactly two bases and stops at third. The batter is on second
- runner on second, single → 0 runs, runners on first and third
- runner on third, single → 1 run, batter on first
- any state, homer → `1 + occupied bases` runs, and the bases are empty

The runner-on-first double is the row that catches an "extra base" change. V6.3 never sends that runner home.

### Innings, walk-off, extras

Script `simulateHalf` draws so opponent runs are known (three baseline draws, no comeback because the lead is under 3, no lead-change draw when the situation does not ask for one).

| Setup | Action | Expect |
|---|---|---|
| Away, 3 innings, top of 3, user ahead after the third out | `inningEnd` | `simulateHalf` runs, then if still ahead, game over. No inning 4 |
| Away, 3 innings, tied after inning 3, 4, and 5 | three half-innings | game continues. After the inning whose number is 6 (`innings + 3`), `finishGame` runs even if tied |
| Home, scheduled last inning, user already ahead after the opponent's half | `inningEnd` from the previous half | game over without a user at-bat |
| Home, last inning, user trails, a hit puts them ahead | `swing` | `walkoff` true, `finishGame`, result `WIN` |
| Home, last inning, user trails, an out | `swing` | not a walk-off. Three outs end the half and then the game if still behind |
| `simulateHalf` rare rally | `late > 0.8`, comeback succeeds, `rareBigRally` draw `< 0.08` | runs are still `<= 5` because of the later cap. Lock the dead branch so a "fix" is visible |
| `simulateHalf` lead change | home, `inning === innings`, user leads by 2, lead-change draw `< 0.58` | opponent score becomes user score + 1, and the log contains `LATE LEAD CHANGE` |
| Forfeit | `finishGame(true)` | result `LOSS`, opponent score at least user + 1 |

### CPU games

- Tournament CPU match with rolls `(0, 0)` stores winner as the first team and score `1–0`.
- League round with equal rolls increments the first score, so the simulated game is not a tie.
- With 7 opponents, after `simulateLeagueRound`, exactly one opponent's record is unchanged.

## 2. Season, tournament, and career-stat rules

These are the rules tests, not the engine-formula tests. Script the RNG. Assert the save object, not the DOM, except where a test is explicitly a render test.

### Season

- `makeSeason` while `d.game` is set does not change `d.season`.
- A new season increments `number`, sets `played` to 0, `phase` to `regular`, and creates a zero `seasonStats` row.
- Schedule length matches the select (10, 20, 40) and only cycles the chosen opponents (at most 7).
- A regular-season **tie** increments `played` and does not change either club's `w` or `l`.
- A regular-season win increments the user's `w` and the opponent's `l`.
- After the last regular game, a user inside the top 4 goes to `playoffs`. `playoffRounds` is 2 when at least 4 teams qualified.
- A user outside the top 4 ends the season. `champion` is the first sorted team. No playoff games are created.
- A playoff **win** with `playoffRounds === 1` makes the user champion.
- A playoff **tie** sets `champion` to the opponent and `phase` to `done`. This locks the current bug on purpose.
- `archiveSeason` writes one history row and sets `archived`. A second `finishGame` does not duplicate it.
- History cap: the 41st archived season drops the oldest. The cap is 40.
- Replacing a season does not change `xp`, `stats`, `roster` counting stats, or `playerSeasonStats` of older numbers.

### Tournament

- 4, 8, and 16 team brackets name the rounds as in the inventory (Round of 16, Quarterfinals, Semifinals, Championship).
- The user's match is unplayed. Every other first-round match has a winner.
- A user win with other winners remaining appends the next round and sets `nextOpponent`.
- A user win in the final sets `result` to `CHAMPIONS 🏆`, adds 250 XP **plus** the 110 win XP, and pushes history.
- A user loss sets history to `Eliminated in {round name}` and does not add 250.
- A **tied** user game: `d.ties` increases by 1, `d.losses` does not, XP gains 60 not 35, `completed[0].result` is `TIE`, `lastFinal.result` is `TIE`, `lastFinal.other === lastFinal.score + 1`, the match winner is the opponent, and the bracket status is `complete` / eliminated. Lock the split. Do not "correct" it here.
- Starting a new tournament does not change `season` or career counters.
- History cap is 25.

### Career stats

- One season-mode single by batter `p3`: `stats.h`, `stats.singles`, `stats.ab`, `roster[p3].h`, `roster[p3].ab`, `playerSeasonStats[n].p3.h`, and `game.batting.h` all increase. `playerSeasonStats` of a different batter does not.
- The same swing in quick mode and in tournament mode does **not** create or increment `playerSeasonStats`. It does increment roster and `stats`.
- At game end in season mode, `seasonStats[n].h` increases by `game.batting.h`, and `seasonStats[n].games` by 1. Quick and tournament games leave `seasonStats` unchanged.
- Roster singles are not stored. `h - doubles - triples - hr` matches the swings just taken.
- XP: the per-kind table, the game table, +75 the first time each daily key crosses its goal, and no second +75 for that key on the same `localDay`.
- Level is `1 + floor(xp / 250)` at 0, 249, 250, and 499.
- Achievements are not stored. After the counters cross a threshold, `legendAchievements` reports that row earned. "Tournament Legend" matches `CHAMPIONS` and does not match `Eliminated`.
- Daily goals: 20 swings, 10 hard, 5 `MC`, using the local date key, not `toLocaleDateString()`.
- A non-hard swing zeros `days[today].streak` and does not zero `maxStreak`.
- `practice.history` drops the oldest past 3,000.
- Undo after one swing restores `stats`, `zones`, `xp`, `practice`, `roster`, `playerSeasonStats`, `game`, and `log`.
- Undo after the third out does nothing, because `undoState` is null.
- Undo is not in the saved JSON. A reload (new IIFE, same `localStorage`) has no undo.
- OBP text equals AVG text. This is a render assertion, locked so a V7 layout change does not quietly start computing a different OBP without a decision.
- Profile hand `L` with a right-handed batter at the plate uses the batter. A pull bonus applies on `ML`, not `MR`.

## 3. Save-compatibility fixtures

Draft these from the loader, not from a captured phone. Put them in `tests/fixtures/` when the foundation PR adds tests. They are quoted here so the audit stands alone. They are synthetic. They are not anyone's real career.

The property section says what must be true after load. Assertions should compare those fields, not a full-file snapshot of `teams`, because every load rewrites `teams` (presets are merged, legacy short names are removed).

### Fixture A — career v2 (`warriors-hit-lab-career-v2`)

The repo never contains a writer for this key. The draft includes the fields the reader copies, plus extra fields the reader must ignore.

```json
{
  "version": 2,
  "xp": 480,
  "wins": 3,
  "losses": 2,
  "ties": 1,
  "games": 6,
  "ab": 42,
  "hits": 15,
  "hr": 2,
  "bestStreak": 4,
  "singles": 9,
  "rbi": 11,
  "teams": ["Rivals", "Custom Kids"],
  "history": ["Won 5-3 vs Rivals", "Lost 2-4 vs Lightning"],
  "player": { "name": "Should Not Load", "hand": "L" },
  "notes": "ignored on purpose"
}
```

After a load with `KEY` and `PREVIOUS` absent:

- `version` is 4
- `xp` 480, `wins` 3, `losses` 2, `ties` 1, `games` 6
- `stats.ab` 42, `stats.h` 15, `stats.hr` 2, `stats.bestStreak` 4
- `stats.singles` is 0 and `stats.rbi` is 0. The v2 `singles` and `rbi` are dropped. Lock that loss so a future migrator does not invent a different one
- `player` is null. The embedded player is dropped
- `log` is the two history strings
- `teams` does **not** contain `"Rivals"` after the normalizer. It does contain `"Custom Kids"` and the 19 presets and 6 builtin city names
- `notes` is absent

### Fixture B — minimal version 3 (`warriors-hit-lab-v3`)

This is the smallest object `valid` accepts, plus a six-zone map and a player, which is the V4-era shape (`8dbe1bf` `fresh()`, with `version: 3`).

```json
{
  "version": 3,
  "player": { "name": "Avery", "hand": "R", "number": "7" },
  "team": "Tampa Warriors",
  "teams": ["Rivals", "Lightning", "My Cousins"],
  "stats": { "ab": 10, "h": 4, "hr": 1 },
  "zones": { "UL": 3, "UC": 1, "UR": 0, "LL": 2, "LC": 1, "LR": 1 },
  "xp": 80,
  "wins": 1,
  "losses": 0,
  "ties": 0,
  "games": 1,
  "completed": [
    {
      "date": "10/17/2026",
      "opponent": "Rivals",
      "for": 4,
      "against": 2,
      "result": "WIN",
      "mode": "quick",
      "batting": { "ab": 10, "h": 4, "hr": 1, "rbi": 3, "doubles": 1, "triples": 0 }
    }
  ],
  "log": ["Top 1, AB 1, UL: example"],
  "season": null,
  "game": null,
  "seasonHistory": []
}
```

After load from `PREVIOUS` with `KEY` absent:

- `version` is 4, `stats.ab` is 10, `stats.h` is 4, `stats.hr` is 1, and the defaulted stat fields (`singles`, `swings`, …) are 0
- `zones.UL` is 3 and `zones.ML`, `MC`, `MR` are 0
- `player` is unchanged
- `completed` and `log` are unchanged
- `playerSeasonStats` is `{}`
- `roster` is the nine defaults with zero counting stats (the fixture had no roster)
- `teams` contains `My Cousins`, does not contain `Rivals` or `Lightning`, and does contain the presets
- `preferences.style` is `arcade`
- `practice.history` is `[]`

### Fixture C — version 3 with a game in progress

Same as B, but `game` is a V4 game object (no `lineupPos`, no `homeGame`). V4 `startGame` did not set those. `ensureRoster` sets `lineupPos` to 0 when it is missing. `homeGame` stays missing. The test should assert the game is the same object otherwise, and that a following swing does not throw. If a swing throws on a missing `homeGame`, that is a baseline bug to record, not to patch inside the test.

```json
{
  "mode": "quick",
  "opponent": "My Cousins",
  "innings": 3,
  "inning": 2,
  "outs": 1,
  "bases": [true, false, false],
  "score": 1,
  "other": 0,
  "ab": 4,
  "batting": { "ab": 4, "h": 1, "hr": 0, "rbi": 0, "doubles": 0, "triples": 0 },
  "started": 1760700000000
}
```

### Fixture D — full V6.3 version 4

A career that has used the current features. Loader should keep every counter. `teams` will still be rewritten (presets merged). Compare the fields listed in the property, not the opponent array's exact order against this file after load... actually after load, presets are first. Assert membership, not order, for `teams`.

```json
{
  "version": 4,
  "player": { "name": "Avery", "hand": "L", "number": "12" },
  "team": "Tampa Warriors",
  "teams": ["Bayou Bandits", "Custom Kids"],
  "roster": [
    {
      "id": "p0", "name": "Alex Carter", "number": "7", "hand": "L",
      "contact": 89, "power": 40, "speed": 90, "clutch": 65,
      "ab": 8, "h": 3, "hr": 1, "rbi": 2, "doubles": 1, "triples": 0
    }
  ],
  "stats": {
    "ab": 8, "h": 3, "singles": 1, "doubles": 1, "triples": 0, "hr": 1,
    "rbi": 2, "runs": 2, "outs": 5, "hard": 4, "medium": 3, "soft": 1,
    "swings": 8, "bestStreak": 2, "streak": 0
  },
  "zones": { "UL": 1, "UC": 0, "UR": 0, "ML": 2, "MC": 3, "MR": 0, "LL": 1, "LC": 1, "LR": 0 },
  "xp": 260,
  "wins": 1, "losses": 0, "ties": 0, "games": 1,
  "completed": [
    {
      "seasonNumber": 1,
      "date": "10/18/2026",
      "opponent": "Bayou Bandits",
      "for": 3, "against": 1,
      "result": "WIN",
      "mode": "season",
      "batting": { "ab": 8, "h": 3, "hr": 1, "rbi": 2, "doubles": 1, "triples": 0 }
    }
  ],
  "log": ["Season 1 begins!"],
  "season": {
    "number": 1, "length": 10, "innings": 6, "played": 1,
    "schedule": ["Bayou Bandits", "Custom Kids"],
    "standings": {
      "Tampa Warriors": { "w": 1, "l": 0 },
      "Bayou Bandits": { "w": 0, "l": 1 },
      "Custom Kids": { "w": 0, "l": 0 }
    },
    "phase": "regular",
    "playoffRounds": 0,
    "playoffOpponent": null,
    "champion": null
  },
  "seasonHistory": [],
  "seasonStats": { "1": { "ab": 8, "h": 3, "hr": 1, "rbi": 2, "doubles": 1, "triples": 0, "games": 1 } },
  "playerSeasonStats": { "1": { "p0": { "ab": 8, "h": 3, "doubles": 1, "triples": 0, "hr": 1, "rbi": 2 } } },
  "tournament": null,
  "tournamentHistory": [],
  "game": null,
  "preferences": { "style": "balanced", "master": false, "effects": true, "voice": false, "volume": 40 },
  "practice": {
    "history": [{ "date": "2026-10-18", "zone": "MC", "power": "hard" }],
    "days": { "2026-10-18": { "swings": 1, "hard": 1, "center": 1, "streak": 1, "maxStreak": 1, "earned": [] } },
    "hardZones": { "MC": 1 }
  },
  "lastFinal": {
    "team": "Tampa Warriors", "opponent": "Bayou Bandits",
    "score": 3, "other": 1, "result": "WIN", "mode": "season",
    "walkoff": false,
    "batting": { "ab": 8, "h": 3, "hr": 1, "rbi": 2, "doubles": 1, "triples": 0 }
  },
  "lastAwards": ["🏆 Victory bonus +110 XP"],
  "showFinal": false,
  "futureField": { "keep": true }
}
```

The roster array in the real app is always length 9. This draft uses one batter so the document stays short. The suite's real fixture file should include all nine, with only `p0` holding the counting stats above and the other eight at zero. `ensureRoster` will **replace the whole roster** if the test file is used with length 1. That is why the committed fixture must be length 9. Do not "fix" `ensureRoster` in the baseline.

`futureField` must still be on `d` after load and after the next `save`. That is the unknown-key guarantee.

### Fixture E — V6.2-shaped version 4

Fixture D with `playerSeasonStats` removed and `completed[0]` missing `seasonNumber`. After load, `playerSeasonStats` is `{}` and the completed row is otherwise unchanged. Roster counting stats and `seasonStats` stay. This is the "past per-player seasons cannot be reconstructed" case.

## 4. Migration never loses data

For every version-3 and version-4 fixture, deep-copy the input, run the load, and assert:

- `stats.ab`, `stats.h`, `stats.hr`, `xp`, `wins`, `losses`, `ties`, `games` are equal to the input when the input had them (v3 fixture B's missing stat keys may become 0; they may not become something else)
- `player` deep-equals the input
- `completed`, `log`, `season`, `seasonHistory`, `seasonStats`, `tournament`, `tournamentHistory`, `practice`, `preferences`, and `game` deep-equal the input where the input had them
- a length-9 `roster` deep-equals, including ids and counting stats
- `playerSeasonStats` deep-equals, or is `{}` when it was absent
- every own-property of the input that is not in the rewrite set is still present with the same value (`futureField`)
- `zones` values for keys that were already there are unchanged, and the nine current keys all exist
- custom team names that are not legacy short names and not equal to `team` are still in `teams`

The rewrite set, which the test must **not** treat as data loss, is the set the V6.3 loader already changes: `version` (becomes 4), `teams` (presets merged, legacy names removed, own team removed, cap 63), missing normalizer fields added, roster repaired only when length is not 9.

For the v2 fixture, the assertion is the copied-field list in section 3, not the generic property. The generic property would fail on purpose, and that failure is the documentation of what v2 already loses.

A second property, on a migrated object that is then saved and loaded again: the second load's career counters equal the first load's. Migration is idempotent for version 4.

An invalid `KEY` (`{ "version": 4 }` missing `stats`) with a valid `PREVIOUS` must be asserted too. Today's code ignores `PREVIOUS` in that case. Lock the current behavior and tag the test `known-gap` so the V7 migrator can replace it with "fall back to v3" only when that change is intentional.

## 5. Export / import round trip

- Export (call `backup` with a stubbed `URL` and anchor) produces JSON that `JSON.parse`s back to a career equal to `d` on the fields in section 4.
- Import of that JSON, after `confirm` returns true, restores those fields.
- Import of fixture B (version 3 with a player) succeeds and sets `version` to 4.
- Import of fixture A (version 2) fails `valid` and does not change `d`. The file-picker path is not the v2 migrator.
- Import of `fresh()` with `player: null` is rejected.
- Import with `teams.length === 64` is rejected. `63` is accepted.
- Import with `player.hand === "S"` is rejected.
- `confirm` returning false leaves `d` and `KEY` unchanged.
- A round trip does not write the snapshot key unless `game` is null and the JSON actually changed. Assert the snapshot rule with two saves.

## 6. Playwright mobile smoke

Serve the **raw** `index.html` (before extraction) and later the built file (after extraction). Same tests.

Seed `localStorage` before navigation when the test needs a career. Use fixture D with a full nine-player roster.

| Flow | SE 375×667 and iPhone 15 393×852 |
|---|---|
| First visit | Profile form is visible, `#app` is hidden, no console error other than the known `apple-mobile-web-app-capable` deprecation if it appears |
| Save profile | App shows Play. Level text matches XP. Reload keeps the name |
| Start a 3-inning quick game | Zone buttons are visible. Contact buttons are disabled. Tap `MC`, contact buttons enable. Tap Hard. The event card shows a result word (`OUT`, `SINGLE`, `DOUBLE`, `TRIPLE`, or `HOME RUN`). The log grows by one |
| Undo | One undo returns the score and the out count. The button disables |
| Three outs | The inning advances or the opponent half is logged. Undo is disabled |
| Forfeit | Confirm, final screen shows `DEFEAT` |
| Finish a scripted short game | Final screen shows the score and a Continue button. Continue reveals pregame |
| Season | Start a 10-game season, see the opponent on Play, play or forfeit one game, standings show a decision |
| Tournament | 4-team bracket shows one unplayed user game and one completed CPU game |
| Team | Rename batter `p0`, reload, the name remains. Ratings outside 1–99 clamp |
| Settings | Switch to balanced, reload, the select is balanced |
| Export / import | Download, wipe `localStorage`, import, the profile name is back |
| Tabs | All six phone-menu entries show their headings. At 700px and below the desktop tab strip is not displayed |

Assert no horizontal overflow on either viewport (`scrollWidth <= clientWidth + 1` on `documentElement`). Assert the contact buttons' boxes are at least 44×44 CSS pixels on SE. The current CSS asks for that (`min-height: 43px` in one place and `44px` in another). Measure, and if V6.3 is 43, lock 43. Do not "fix" the target in the baseline.

Console: fail on `pageerror`. Do not fail on the Apple meta deprecation warning.

## 7. Offline and service worker

Unit tests against `sw.js` in a VM:

- `install` opens `warriors-hit-lab-v6-3-team-cleanup` and `addAll`s `./`, `./index.html`, `./manifest.webmanifest`, `./icon.svg`.
- `activate` deletes `warriors-hit-lab-v6.2-team-cleanup` and keeps the current name.
- A failed `fetch` returns `caches.match`.
- A resolved `fetch` with `ok: true` and a same-origin URL is what the page receives, and `put` is called with a clone.
- A GET that returns 404 is returned, not replaced with the cache.
- A POST is ignored.

Playwright, only on an HTTPS origin (local cert or `vite` behind a tiny TLS proxy):

- First load registers `./sw.js`.
- Go offline, reload, the profile or the play screen still appears, because the precache answered.
- Go offline **before** the first load: the test expects a browser error page. That is current behavior (network-first with an empty cache). Do not change the worker to cache-first just to make this test pass.
- After a second test server that serves a different `index.html` and a worker whose cache name changed, one reload shows the new title. This is the stale-worker check.

HTTP Playwright should assert that `navigator.serviceWorker.controller` stays null. That locks the `https:` guard.

## 8. Visual parity screenshots

Capture after the smoke flows, both viewports, full page, animations disabled (`reducedMotion: 'reduce'` in the Playwright context even though V6.3 ignores it, so the baseline files already show the reduced-motion presentation).

| Shot | How to reach it |
|---|---|
| `setup` | Empty storage |
| `play-pregame` | Fixture D with `showFinal: false` and `game: null` |
| `play-active` | Fixture D plus a game object, `selected` not set | 
| `play-zone-selected` | Click `MC` before the shot |
| `play-final-win` | `showFinal: true` and a win `lastFinal` |
| `play-final-tie` | A tie `lastFinal` with **unequal** scores, to freeze the current tournament-tie presentation |
| `career` | Fixture D |
| `team` | Fixture D |
| `season` | Fixture D |
| `tournament-empty` | `tournament: null` |
| `tournament-active` | A 4-team active bracket in the fixture |
| `settings` | Fixture D |

Mask `#saveStatus`. It includes `toLocaleTimeString()`, so it changes every run. Mask nothing else. Store PNGs under `tests/visual/` and compare with a small pixel threshold (about 0.1%) for antialiasing. Fail on a shifted control, a missing zone, or a color change in the result card.

These shots are the V6.3 contract. The V7 UI phase will replace them on purpose, in that PR, not by letting them rot.

## 9. Manual iPhone checks

Run these on a real phone before any V7 build is considered for Pages. A simulator is extra, not a substitute. The owner mentioned iPhone field testing in the V5.0 README. Keep that list and add the storage cases.

Use the production origin only for the "current live site" pass. Use a preview origin for anything built by Vite, so the preview cannot share `localStorage` with the live career. Different host means a different store. Do not point a preview at `diamondiq2026.github.io` until the release plan says so.

1. Add to Home Screen. Cold-open the icon. Profile or career appears. Notch: note whether the title sits under the status bar (expected today; no safe-area padding).
2. Airplane mode after one online load. Open again. The app appears. Record a swing if a game was in progress. Leave airplane mode and confirm the swing is still there.
3. Private tab: play a swing, close the tab, open a new private tab. Expect an empty career. Confirm the normal tab's career was not touched.
4. Storage pressure: no need to fill the disk by hand if export/import works. Export, delete the site's data in Safari settings, import, and confirm wins, roster names, and the season match.
5. All nine zones, then Hard, Medium, and Soft. Each produces one result card and one log line. Undo once. Confirm the score returns.
6. Rotate the batter through all nine by taking nine swings. Names and hands match the roster.
7. Edit a roster name and a rating, kill the app, reopen. Values stuck.
8. Start a 3-inning season game and a 4-team tournament on a copy of the export, not on the only career. Finish or forfeit. Standings or the bracket moved. Career wins moved by the game result, not by a second phantom game.
9. Sounds: mute, a swing stays silent. Unmute, a swing can speak. If iOS blocks audio, the game still records the swing.
10. Reduced Motion switched on in iOS settings. Today the result card should look the same, because there is no animation. Write that down, so the V7 animation pass has a before.
11. VoiceOver: the zone buttons expose their text, the menu button exposes its expanded state, and the result card is a live region (`aria-live="polite"` on `#event`).
12. After the V7 worker exists: install the update, stay on the old screen, confirm it does not half-apply a new save format, then reload once and confirm the new build id.

Write the results in the PR that asks to switch Pages. A desktop-only green CI run is not that sign-off.

## What this plan deliberately does not lock

- Pixel-perfect opponent runs across `Math.random` with no script. Those stay untested until the queue is installed.
- Safari's multi-day storage eviction. Manual only.
- A real phone export from the owner. The synthetic fixtures should be joined by that file when it exists. Do not commit a real child's save to the public repo. The V6 README already forbids uploading backup JSON. If a real file is used, it stays in CI secrets or in a local ignored path, and the test asserts structure, not the child's name in git.

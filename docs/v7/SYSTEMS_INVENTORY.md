# Warriors Hit Lab V6.3 systems inventory

Source of truth: `index.html`, `sw.js`, `manifest.webmanifest`, and `README.txt` at `489ccf8`. Function line numbers are in `ARCHITECTURE.md`. This file is the inventory those lines implement.

There is one career on the device. There is no second profile, no login, and no server.

## Gameplay modes

The mode `<select>` (`#gameMode`, line 134) has three values. There is no fourth mode.

| Mode | Select value | Changes standings or bracket? | Batting counts |
|---|---|---|---|
| Season game | `season` | Yes. Requires an active `seasonMatch` | Career totals, roster totals, **and** this season's per-player and team totals |
| Quick play | `quick` | No. Opponent and innings come from the Play form | Career totals and roster totals only. The README states this on purpose |
| Tournament game | `tournament` | Yes. Requires an active bracket game | Career totals and roster totals only. Not the season tables |

`render` forces the select back to `quick` if season or tournament is chosen while no match is available, and it disables those options.

**There is no practice mode.** A tee swing can be recorded only inside a started game. `practiceSwing` runs from `swing`, so "real tee" history, daily challenges, and zone counts all require a quick, season, or tournament game. Ending that game early is a forfeit and counts as a loss. This matters for V7: Academy and a real-tee log need a path that does not write a game result.

One person bats for all nine lineups spots. `lineupPos` advances after every swing, including outs. The kid cannot skip a batter.

Innings are 3, 6, or 9. Quick play reads `#inningsSelect`. Season and tournament lock that select and use the length stored on the season or the bracket. Home or away is chosen at `startGame` (about 65% home) and is not a setting.

## Season

`makeSeason` (line 190) is blocked while a game is in progress. Replacing a season asks for confirmation, calls `archiveSeason` first, then builds a new one. The length is 10, 20, or 40 (`#seasonLength`, default 20). Innings are 3, 6, or 9 (`#seasonInnings`). The season number is `(previous number or 0) + 1`. `trackedSeason` creates an all-zero team batting row for that number immediately, before any swings.

Opponents: every team in `d.teams` except the user's name, shuffled, then cut to at most 7. The user's team is not stored in `d.teams`. An 8-team league is the user plus those 7. The schedule is that list cycled: `opponents[i % opponents.length]` for each game. It is not a full round-robin, and home or away is not part of the schedule.

Standings are `{ [teamName]: { w, l } }`. There is no tie column.

After each **regular-season** user game, `processSeason` (line 231):

1. Increments `played`.
2. `updateStanding` for the user and the opponent. If the scores are equal it returns without changing either record. A tie still consumes a schedule slot. Winning percentage is `w / (w + l)`, so ties are invisible in the percentage.
3. `simulateLeagueRound` pairs the other teams in standings-key order and gives them a random decision. With 7 opponents, the last one plays nobody, every round, because the pairs do not rotate. A team can finish 0–0 having only faced the user.
4. When `played >= length`, teams are sorted by winning percentage, then by wins. The top 4 (or fewer, if the league is smaller) are the playoff field.
   - If the user is in that field and at least two teams qualified, `phase` becomes `'playoffs'`. `playoffRounds` is 2 when four or more teams qualified, otherwise 1. The opponent is the **last** other qualifier in that sorted list (the lowest seed among the others), not the winner of another series. No other playoff series is simulated.
   - Otherwise `phase` becomes `'done'` and `champion` is `top[0]`. If the user missed the cut, nobody plays a playoff. The regular-season leader is the champion.

A playoff game:

- User wins (`score > other`): decrement `playoffRounds`. At 0 or below, the user is champion. Otherwise the next opponent is the remaining team with the most regular-season wins, excluding the user and the team just beaten.
- User loses **or ties**: `phase` is `'done'` and the opponent is the champion. A playoff tie eliminates the user.

`archiveSeason` runs at the end of `finishGame` and again at the start of `makeSeason`. If `phase === 'done'` and `archived` is not set, it unshifts a history row and caps `seasonHistory` at 40, then sets `archived`. The row stores the season number, a copy of the team batting totals, the champion name, games played, the user's `{w, l}`, and `toLocaleDateString()`.

`#replaceSeason` does not start a season. It only reveals the setup form again. The actual replace still goes through `makeSeason` and its confirm.

The Play-tab overview (`renderModeOverview`, lines 259–278) repeats the standings while season mode is selected. The Season tab has the full table.

## Tournament

`startTournament` (line 191) supports 4, 8, or 16 teams (default 8) and 3, 6, or 9 innings (default 3). It needs `size - 1` opponents in `d.teams`. The field is the user plus a random slice of opponents, then shuffled a second time. Starting a new bracket while one is active asks for confirmation. The copy says career and season are kept. The unfinished bracket is discarded and is not written to history.

`generateTournamentRound` (line 192) pairs `entrants` as `(0,1), (2,3), ...`. The pair that contains the user's team is left unplayed (`winner: null`) and `nextOpponent` is the other team. Every other pair is decided immediately with two `rand(0, 9)` rolls. Round names: 16 teams "Round of 16", 8 "Quarterfinals", 4 "Semifinals", 2 "Championship". `autoWinners` is written and never read.

`processTournament` (line 193) runs only when the finished game's mode is `'tournament'` and the bracket is `'active'`. The user's match in the latest round gets `winner` and `score`.

- If the user does not win, status is `'complete'`, `champion` is null, `result` is `"Eliminated"`, and history gets `"Eliminated in {round name}"`.
- If the user wins and they are the only winner left, status is `'complete'`, `champion` is the user's team, `result` is `"Champion"`, history gets `"CHAMPIONS 🏆"`, and XP gains **250** on top of the game XP.
- Otherwise `round` increments and the next round is generated from the winners, which mixes the user's real result with the CPU results.

History is capped at 25. The cap runs after every tournament game, not only the last one. Each history row keeps the full `rounds` array. The UI prints date, size, and `result` only.

The achievement "Tournament Legend" counts history rows whose `result` matches `/champion|won|winner/i`. `"CHAMPIONS 🏆"` matches. `"Eliminated in …"` does not.

### Tied tournament games

`finishGame` computes `result` **before** the tiebreak:

1. Equal score becomes `result = 'TIE'`.
2. If the mode is tournament and the score is still equal, `g.other` is incremented by 1 and the log says `Tournament tiebreaker: opponent wins in sudden death.`
3. The career counter still uses the old `result`, so this game increments `ties`, pays **60** tie XP, and stores `completed[].result` as `'TIE'`.
4. `lastFinal.result` is also `'TIE'`, but `lastFinal.other` is the incremented score. The final screen can say **TIE GAME** next to two different numbers.
5. `processTournament` then sees the user behind and eliminates them.

So the bracket treats the game as a loss, and the career ledger treats it as a tie. The 2026-10-22 audit called this an automatic loss. That describes the bracket and the log line. It does not describe `wins` / `losses` / `ties`.

## Career statistics, XP, levels, legends

### XP and level

| Event | XP |
|---|---|
| Out / single / double / triple / homer | 3 / 15 / 25 / 35 / 55 |
| Win / loss / tie | 110 / 35 / 60 |
| Each daily challenge, once per local day | 75 |
| Tournament championship | 250 |

`level()` is `1 + floor(xp / 250)`. The bar is the remainder toward the next 250. XP is one number. It is not split by mode.

### What a swing writes

Career `d.stats` (every mode): `ab`, `h`, `singles`, `doubles`, `triples`, `hr`, `rbi`, `runs`, `outs`, `hard`, `medium`, `soft`, `swings`, `streak`, `bestStreak`.

Roster batter (every mode): `ab`, `h`, `hr`, `rbi`, `doubles`, `triples`. Singles are not stored on the batter. They can be derived as `h − doubles − triples − hr` only if those stay consistent.

`playerSeasonStats[seasonNumber][batterId]` (season mode only, and only when `d.season` exists): `ab`, `h`, `doubles`, `triples`, `hr`, `rbi`. Created by `seasonPlayerEntry` (line 280). Quick play and tournament do not touch it.

`seasonStats[seasonNumber]` (season mode, at **game end**, from the game's combined batting line): `ab`, `h`, `hr`, `rbi`, `doubles`, `triples`, `games`. This is the team-wide season line, not a per-batter line. A forfeit still adds the partial game.

`d.zones[zone]` increments for every swing, in every mode, before the governor.

Displayed on Career (line 279): AVG, hits, at-bats, HR, RBI, runs, doubles, triples, SLG, **OBP**, OPS, swings. OBP is the same number as AVG. With no walks that is the arithmetic result, but the label implies a different stat. OPS is AVG + SLG. SLG uses the usual 1/2/3/4 weights. Zone tiles use the nine codes. The label for a zone the merge does not know is passed through `safe`.

The Team table (`renderIndividualStats`, lines 281–285) can show the current season, career (the roster objects), or a past season key. Past keys are added as `<option value="season:N">`. Leader cards are most hits, HR, RBI, and at-bats. Ties list every name. CSS class `team-leader` is never applied to a row.

The README is accurate that quick play and tournament skip season totals, that season totals update per swing (the per-batter ones do; the team `seasonStats` row updates at game end), and that undo reverses them. It is also accurate that old saves keep career totals and cannot rebuild per-player season lines the app never stored.

### Achievements and Hall of Fame

`legendAchievements` (lines 182–188) builds 24 achievements on each render. Nothing about them is stored. They unlock when the live numbers cross a threshold. Categories:

- **ROOKIE (4):** first hit, first HR, 10 hits, 100 swings.
- **ALL-STAR (5):** 100 hits, 25 HR, 100 RBI, 10 wins, a 10-hit streak (`bestStreak`).
- **SEASON RECORD (6):** a single season's team line (`seasonStats`, not the per-player table) reaches 5, 10, 20, or 40 HR, or 50 hits, or 50 RBI. The V5.6 README called these fictional milestones. The current README does not repeat that sentence. The thresholds are still just these comparisons.
- **LEGEND (7):** 100 HR, 500 hits, 500 RBI, 50 wins, 1 league championship, 3 championships, 1 tournament title.
- **HALL OF FAME (2):** 500 hits + 50 HR + 250 RBI + 25 wins, and 1,000 hits + 150 HR + 750 RBI + 75 wins.

Championships count `seasonHistory` rows whose `champion` string equals `d.team`, plus the current season if it has the same champion and is not archived yet. Renaming the team later makes old champion strings miss. Tournament credit uses the history regex above, not the team name.

`renderLegends` prints `unlocked of 24` and the best season HR / hits / RBI, then one row per `seasonStats` entry (newest number first). If `seasonStats` is empty it says tracking starts with this update.

### Daily challenges and the real-tee panel

`challenges` (line 234), fixed, three per local day (`localDay`, `YYYY-MM-DD` from the device clock):

| Key | Goal | Name | Text |
|---|---|---|---|
| `swings` | 20 | Tee Time | Record 20 tee swings |
| `hard` | 10 | Barrel Hunter | Make 10 hard-contact swings |
| `center` | 5 | Bullseye | Hit middle-middle 5 times |

`practiceSwing` (line 235) bumps today's bucket, the hard-contact streak (a non-hard swing zeros it), `maxStreak`, and `center` when the zone is `MC`. The first time a goal is met, the key is pushed onto `earned` and XP increases by 75. History appends `{ date, zone, power }` and keeps the last 3,000. `hardZones[zone]` counts hard swings per zone for the whole career. `days` is never pruned. `todayData` creates a zeroed day the first time it is called, and `render` calls it, so opening the app on a new day writes an empty day that shows up as "0 swings".

The Career panel "Real Tee Progress" shows recorded swings, hard-contact percent, and middle-middle percent from `practice.history`, plus the last 10 days. The hint under it says this is self-reported contact and net placement, separate from simulated batting. That split is real in the data: `practice` stores zone and power, `stats` stores the simulated kind. The governor is the place they diverge. Both still come from the same button, and both sit on the same career object.

Daily challenge cards are drawn twice: once on Career (`#dailyChallenges`) and once on Play (`#playDailyChallenges`), by cloning the nodes.

### Postgame awards

`postgameHighlights` (line 241) returns strings, stored on `lastAwards` for the final screen. Win, loss, and tie each get a fixed sentence. Optional extras: walk-off, any homer ("Power Performer"), 5 or more hits ("Hit Parade"), 3 or more RBI ("Clutch Offense"). If nothing else matched, the fallback is "Another game in the books". These are labels, not more XP, except the win sentence mentions the +110 that `finishGame` already added.

### Completed games

`completed` holds up to 100 objects: `seasonNumber` (the season's number, or null outside season mode), `date` (`toLocaleDateString()`, locale-dependent), `opponent`, `for`, `against`, `result`, `mode`, `batting`. The Career list shows 25. The Play log shows 22 of `d.log` (itself capped at 75).

## Profiles, team, and roster

### Profile

`setProfile` (line 287) requires a non-empty name, a non-empty team, and hand `L` or `R`. Team rename is refused during a game and during a season whose phase is not `'done'`. The team name cannot match an opponent, case-insensitively. The stored player is only `{ name, hand, number }`. Number is a string. There is no player id. Saving the profile does not reset stats.

The profile hand is shown in the header and on Career. **At-bat handedness comes from the batter in the lineup, not from the profile.**

### Roster

`rosterDefaults` (lines 160–161) is nine fictional batters. `makeRoster` gives them ids `p0` through `p8` and zero counting stats. `ensureRoster` replaces the whole roster if it is missing or not length 9, which drops stats if a save is corrupt. For a valid nine it fills a missing id, forces hand to `L` or `R` (otherwise the profile hand, otherwise `R`), floors counting stats at 0, and clamps `contact`, `power`, `speed`, and `clutch` to 1–99 (default 50 if the value is unusable).

| Order | Name | No. | Hand | Contact | Power | Speed | Clutch |
|---|---|---|---|---|---|---|---|
| 1 | Alex Carter | 7 | L | 89 | 40 | 90 | 65 |
| 2 | Logan Price | 2 | R | 84 | 52 | 82 | 69 |
| 3 | Ethan Brooks | 11 | L | 82 | 80 | 68 | 75 |
| 4 | Jake Miller | 27 | R | 76 | 94 | 61 | 88 |
| 5 | Noah Davis | 16 | L | 79 | 83 | 58 | 79 |
| 6 | Mason Reed | 8 | R | 80 | 68 | 77 | 73 |
| 7 | Tyler Hayes | 3 | R | 73 | 72 | 80 | 67 |
| 8 | Liam Parker | 24 | L | 75 | 61 | 72 | 70 |
| 9 | Cole Turner | 15 | R | 77 | 56 | 86 | 65 |

The editor (line 286) can change name (max 24, blank becomes `"Player N"`), number (max 3), hand, and the four ratings. Up and down swap array slots. The id moves with the player, so `playerSeasonStats` follows the player rather than the slot. Reordering is disabled while a game is in progress. Every edit calls `save` and `render`. The hint says statistics follow the player. That is true for ids. It is not true if `ensureRoster` rebuilds the nine because the array length changed.

### Opponents

`presetTeams` is 19 names (line 156): Bayou Bandits, Savannah Swamp Foxes, Carolina Moonshiners, Pensacola Pelicans, Desert Scorpions, Smoky Mountain Sasquatch, Gulf Coast Ghost Crabs, Tallahassee Thunderhawks, River City Rattlers, Ozark Outlaws, Palm Beach Pirates, Cocoa Beach Comets, Appalachian Axemen, Bourbon City Bats, South Georgia Gators, Blue Ridge Bombers, Daytona Daredevils, Everglades Night Owls, Cedar Rapids Cyclones.

`builtin` is 6: Riverbend Rivals, Lakeland Lightning, Tampa Bay Titans, Venice Vipers, Sarasota Storm, Fort Myers Falcons.

`fresh().teams` is presets then builtin, 25 names. The Team screen says "N available". Presets cannot be removed (the remove button is hidden). Builtin and custom teams can be removed when no game is in progress and no season is unfinished. `addTeam` requires at least 2 characters, refuses duplicates and the user's own name, refuses changes during a game or an unfinished season, and stops at 63 opponents (the message says 64 including yours). On every load the list is rebuilt as presets, then builtin, then saved names, with blanks dropped, `legacyTeamNames` removed, the user's team removed, and a cut at 63.

`legacyTeamNames` is `Rivals`, `Lightning`, `Titans`, `Vipers`, `Storm`, `Falcons`. Those short names were the opponents before the city names. A custom opponent that is exactly one of those words is deleted on every load. Names already inside a saved season or bracket are not rewritten. The V6.2 README said that, and the code matches it.

## Settings and preferences

`d.preferences` defaults, then any saved values (lines 156 and the normalizer):

| Field | Default | Control |
|---|---|---|
| `style` | `'arcade'` | `#playStyle`: `arcade` or `balanced` |
| `master` | `true` | `#soundMaster` and the in-game `#quickMute` toggle |
| `effects` | `true` | `#soundEffects` |
| `voice` | `true` | `#soundVoice` |
| `volume` | `65` | `#soundVolume` range 0–100 |

`soundEffect` (line 239) plays short oscillator tones through Web Audio: homer `523, 659, 784`; out `220, 185`; win `392, 523, 659, 784`; anything else `320, 430`. Volume scales the gain. Failures are swallowed. `speakCall` (line 240) uses `speechSynthesis` at rate `1.08`. Turning master or voice off cancels speech. The settings copy says iPhone may need a tap before audio works. There is no reduced-motion switch and no separate "mute the speaking but keep the tones" persistence beyond the two checkboxes.

Other settings actions: edit profile, restore snapshot, export, import, reset. The footer states that outcomes are entertainment, that there is no account or server, and that Diamond IQ is a separate project.

## Undo

`undoState` is not in the save. `swing` writes it before changing stats, as a `structuredClone` of `practice`, `stats`, `zones`, `xp`, `game`, `log`, `roster`, and `playerSeasonStats`.

`undoSwing` (line 259) restores those fields and clears the selection and the result coloring. It does nothing if there is no game. It cannot undo a third out or a finished game, because `inningEnd` and `finishGame` set `undoState = null` before the player can tap. It cannot undo across a refresh. It does not need to restore `wins` or the season object: those change only at game end, when undo is already gone. Daily-challenge XP awarded by that swing is inside the cloned `xp` and `practice`, so undo removes it.

## Export and import

`backup` (line 287) downloads `JSON.stringify(d, null, 2)` as `warriors-hit-lab-save.json`. It exports the live object, including whatever the normalizers have added. It does not export the snapshot key, and it does not include `undoState`.

Import (line 290) parses the file and requires `valid(obj)`, a player whose hand is `L` or `R`, and `teams.length <= 63`. A career-v2 file fails this, because `valid` only allows version 3 or 4 and also requires `stats`, `teams`, `completed`, and `log`. A freshly reset save fails it too, because `fresh()` has `player: null`. After confirm, the object replaces `d`, `version` is set to 4, presets are merged back into `teams`, history arrays and stat objects are defaulted if missing, roster is repaired, undo and the zone selection are cleared, and the result is saved. Import **replaces** the current career. It does not merge two kids.

`valid` (line 156) is only:

```
object
&& (version === 3 || version === 4)
&& stats && typeof stats.ab === 'number'
&& Array.isArray(teams)
&& Array.isArray(completed)
&& Array.isArray(log)
```

Unknown extra keys are not rejected. They survive on `d` and are written back out by the next `save`, because the loader assigns the whole object and only overlays specific fields.

## Saved-game system

### Keys

| Key | Constant | Role |
|---|---|---|
| `warriors-hit-lab-v4` | `KEY` | The only career the game writes. Holds the whole `d` object. The name says v4; V6.3 still uses it |
| `warriors-hit-lab-v3` | `PREVIOUS` | Read only when `KEY` is missing or empty. Never written by this file. Never deleted |
| `warriors-hit-lab-career-v2` | `OLD` | Read only when the v4/v3 value is missing or fails `valid`. Never written. Never deleted |
| `warriors-hit-lab-v6-snapshot` | string literal in `save` and in the restore handler | Previous `KEY` payload. One slot. Not a version history |

No other `localStorage` key is referenced.

Load order (line 156), inside one `try/catch` that ignores errors:

1. `JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(PREVIOUS))`.
2. If `valid`, that object **is** `d`.
3. Otherwise parse `OLD`. If `old.version === 2`, copy the few fields listed under migration. Do not take the rest of the object.
4. If `KEY` is present but invalid, `PREVIOUS` is not consulted. The `||` only falls through when `KEY` is null or `''`. A corrupt v4 value skips a good v3 value and may start a fresh career, which the next save will write over `KEY`.

After that, `d.version = 4` always. Then the normalizers run (`tournament`, histories, `seasonStats`, `playerSeasonStats`, zones, stats, teams, preferences, practice, roster).

### When a save happens

`save` (line 164):

1. `next = JSON.stringify(d)`, `prev = localStorage.getItem(KEY)`.
2. If `prev` is non-empty, `prev !== next`, and `d.game === null`, write `prev` to `warriors-hit-lab-v6-snapshot`.
3. Write `next` to `KEY`.
4. On quota or private-mode failure, set `#saveMessage` to `Unable to save: browser storage is full or disabled.` That node lives on the Settings tab. The text changes even if the user is looking at Play, but they will not see it until they open Settings. No alert, no retry.

Callers:

| Moment | Game in progress? | Snapshot updated? |
|---|---|---|
| `render`, if a player exists | Sometimes | Only if this render made a content change while `game` is null |
| `setProfile` | No, or yes if the team name did not change | Yes if `game` is null and the JSON changed |
| `startGame` | Becomes yes | No, because `game` is now set. The snapshot stays at the pre-game career |
| `swing`, when the inning continues | Yes | No |
| `inningEnd`, when the game continues | Yes | No |
| `undoSwing` | Yes | No |
| `finishGame` | Becomes null **before** `save` | Yes. The snapshot becomes the last in-progress JSON, because that is `prev` |
| `finalContinue` | No | Yes, if clearing `showFinal` changes the JSON. That replaces the in-progress snapshot with the finished game |
| `makeSeason`, `startTournament`, roster edits, add/remove team | No (these are blocked during a game) | Yes |
| Preference changes, mute | Either | Only when `game` is null |
| Import, restore | Whatever the payload contains | The following `save` uses the rule above |
| `reset` | `fresh()` has `game: null` | Yes. The snapshot becomes the career from just before the reset, until the next null-game save replaces it |

`finishGame` then calls `render`, which calls `save` again. If the second stringify matches the first, the snapshot is left holding the in-progress game. Restore on the final screen, before Continue, can bring that game back. Finishing it again runs `processSeason` / `processTournament` a second time. Continue, or any other null-game edit, moves the snapshot forward and closes that window.

The snapshot is not written during a game, so it is not a mid-game undo. Mid-game crash recovery is `KEY` itself, which is updated on every swing. Restore refuses a snapshot that fails `valid`.

`reset` does not remove the snapshot or the v2/v3 keys. It writes `fresh()` to `KEY` immediately, even though `render` then returns early and does not save again. The on-disk reset object has no roster, preferences, or practice until the next load normalizes them. Exporting before that reload produces a file import will reject, because there is no player.

### Internal version number

The integer on the object is **4**. `valid` accepts **3 or 4**. V6.3 does not write 5 or 6. The product name "V6.3", the cache name, and this integer are three different versions.

### JSON schema of `warriors-hit-lab-v4` after a normal session

Types below are what the code writes or repairs. Older saves can omit the fields marked "added by later versions." The loader fills those. It does not delete extra keys.

Top level:

| Field | Type | Notes |
|---|---|---|
| `version` | number | Always rewritten to `4` |
| `player` | `{ name: string, hand: "L" \| "R", number: string }` or `null` | `null` until the profile is saved |
| `team` | string | Default `"Tampa Warriors"` |
| `teams` | string[] | Opponents only, max 63 after load |
| `roster` | array of 9 batter objects | Not in `fresh()`. Added by `ensureRoster` |
| `stats` | stats object | See below |
| `zones` | `{ UL, UC, UR, ML, MC, MR, LL, LC, LR: number }` | Missing keys become 0. A V4 six-zone save gains `ML`, `MC`, `MR` |
| `xp`, `wins`, `losses`, `ties`, `games` | number | |
| `completed` | array, max 100 | Game summaries |
| `log` | string[], max 75 | Newest first |
| `season` | season object or `null` | |
| `seasonHistory` | array, max 40 | |
| `seasonStats` | `{ [seasonNumber: string]: teamSeasonLine }` | Added in V5.6-era code. Not in the earliest `fresh()` |
| `playerSeasonStats` | `{ [seasonNumber: string]: { [batterId: string]: playerLine } }` | **V6.3.** Empty object if missing |
| `tournament` | tournament object or `null` | |
| `tournamentHistory` | array, max 25 | |
| `game` | game object or `null` | The in-progress game |
| `preferences` | preferences object | V6. Defaulted if missing |
| `practice` | practice object | V6. Defaulted if missing |
| `lastFinal` | final object | Absent until the first finished game |
| `lastAwards` | string[] | Absent until then |
| `showFinal` | boolean | Absent until then. Treated as off when missing |

Stats object (`defaultStats`): all numbers. `ab`, `h`, `singles`, `doubles`, `triples`, `hr`, `rbi`, `runs`, `outs`, `hard`, `medium`, `soft`, `swings`, `bestStreak`, `streak`.

Batter: `id` string (`"p0"`…`"p8"` unless edited in a hand-built save), `name` string, `number` string, `hand` `"L"` or `"R"`, `contact` / `power` / `speed` / `clutch` numbers 1–99, `ab` / `h` / `hr` / `rbi` / `doubles` / `triples` numbers.

Team season line: `ab`, `h`, `hr`, `rbi`, `doubles`, `triples`, `games`, all numbers.

Player season line: `ab`, `h`, `doubles`, `triples`, `hr`, `rbi`, all numbers.

Season: `number` number, `length` number, `innings` number, `played` number, `schedule` string[], `standings` `{ [name]: { w: number, l: number } }`, `phase` `"regular"` \| `"playoffs"` \| `"done"`, `playoffRounds` number, `playoffOpponent` string or null, `champion` string or null, `archived` boolean once archived.

Season history row: `number`, `batting` (a team season line; **absent on rows archived before that field existed**), `champion`, `played`, `record` (`{w, l}` or missing if the name was not in standings), `date` string.

Completed-game row: `seasonNumber` number or null (absent on pre-V6.3 rows), `date` string, `opponent` string, `for` number, `against` number, `result` `"WIN"` \| `"LOSS"` \| `"TIE"`, `mode` string, `batting` object of numbers (`ab`, `h`, `hr`, `rbi`, `doubles`, `triples`).

Game: `mode` `"quick"` \| `"season"` \| `"tournament"`, `opponent` string, `innings` number, `inning` number, `outs` number, `bases` `[boolean, boolean, boolean]` (first, second, third), `score` number, `other` number, `ab` number, `lineupPos` number, `batting` same shape as a completed batting line, `started` number (epoch ms), `homeGame` boolean, `walkoff` boolean, `inningRuns` number.

Tournament: `id` number (epoch ms), `size` number, `innings` number, `status` `"active"` \| `"complete"`, `round` number, `entrants` string[], `rounds` array of `{ name: string, matches: [{ a, b, winner: string\|null, score: string\|null }] }`, `nextOpponent` string or null, `champion` string or null, `result` string once complete, `autoWinners` string[] (written, unused).

Tournament history row: `size` number, `date` string, `result` string, `rounds` the same round array.

Preferences: `style` string, `master` boolean, `effects` boolean, `voice` boolean, `volume` number.

Practice: `history` array of `{ date: string, zone: string, power: string }` (max 3000), `days` `{ [YYYY-MM-DD]: { swings, hard, center, streak, maxStreak: number, earned: string[] } }`, `hardZones` `{ [zone]: number }`.

Final: `team`, `opponent`, `score`, `other`, `result`, `mode`, `walkoff` boolean, `batting` copy.

Not stored: `selected`, `currentTab`, `undoState`, `audioContext`.

### Migration paths

**Version 3 → in-memory version 4.** Used when `KEY` is absent and `PREVIOUS` parses and passes `valid`. The object is kept wholesale. `version` is set to 4. Missing `playerSeasonStats`, `preferences`, `practice`, and a bad roster are filled. Zones merge over the nine-key template, so a six-zone v3/v4 save gains three zeros. Teams are rebuilt (presets and builtin forced in, legacy short names forced out). Career numbers, `completed`, `log`, `season`, `game`, and any unknown keys stay. Per-player season lines that were never stored are not invented. This is what the V6.3 README means by "past per-player season data cannot be reconstructed."

No commit in this repo writes `version: 3`. The v3 shape is whatever a pre-repo build put in `warriors-hit-lab-v3`. The only contract this code enforces is `valid`. A practical fixture is the V4 `fresh()` shape with `version: 3`, a player, six zone keys, and no roster. That is the shape `8dbe1bf` already knew how to load. Draft JSON is in `BASELINE_TEST_PLAN.md`.

**Career v2 → a new version-4 object.** Used only in the `else` branch. Copied fields:

| v2 field | Lands on |
|---|---|
| `xp`, `wins`, `losses`, `ties`, `games` | the same names |
| `ab` | `stats.ab` |
| `hits` | `stats.h` (the key is renamed; `singles` stays 0) |
| `hr` | `stats.hr` |
| `bestStreak` | `stats.bestStreak` |
| `teams` | merged in front of `builtin`, cut at 63, then the later team rebuild removes legacy short names and adds presets |
| `history` | `log`, first 30 entries, each forced to a string |

Anything else on the v2 object is dropped, because the code never copies the object. `player` stays null, so the child sees the create-profile screen with the numbers already in memory. Those numbers are not written to `KEY` until something calls `save` (the profile screen's `render` returns before `save`). Closing the tab before "Save player" leaves the v2 key untouched and the v4 key unwritten. `version` must be `2` or the block does not run.

**Version 4 → version 4.** The normal path. Same normalizers. A V6.2 save has no `playerSeasonStats`; it becomes `{}`. Existing roster counting stats stay, which is the "career totals are preserved" guarantee.

**File import** does not run the v2 branch and does not read the v3 key. It requires an already valid version 3 or 4 file with a player.

### Snapshot schema

`warriors-hit-lab-v6-snapshot` is a previous stringify of the same career object, not a different schema. Restore checks `valid`, then re-applies preference, practice, and roster repairs. It clears undo and the selected zone.

## Audio and speech

Covered above. Sounds are cosmetic. They do not decide outcomes. `speakCall` phrases are `"Out!"`, `"{RESULT}!"` plus an optional run count, `"Walk off win!"`, `"Warriors win!"`, and `"Final score. Great effort!"`.

## Quirks and bugs

Confirmed in this tree:

1. **Tournament tie is two different results.** Bracket: opponent wins, user is eliminated. Career: a tie, +60 XP, final-screen title "TIE GAME", score not tied. See `finishGame` versus `processTournament`.
2. **The governor turns hits into outs** after the real-tee row is stored. At 3, 4, and 5 runs already scored in the inning, the flip chances are 34%, 70%, and 92%. It is skipped when `inning >= scheduled length` and the user is tied or behind. The child is not told a hit was changed.
3. **Stale cache suffix.** The live cache is `warriors-hit-lab-v6-3-team-cleanup`. The feature in that build is individual season stats. The suffix is the V6.2 team-directory change. V5.8 did not change its cache name at all.
4. **Three version labels.** README and the file the site serves are V6.3. The header subtitle (`#subtitle`, line 129) still says `Full Team Career · Version 6 · Ultimate Edition` until a profile exists, and after that it is replaced with the player's name. The manifest and `<title>` still say "Full Team Career". The save integer is 4. CSS comments still say V4.2, V5.0, V5.1, V5.2, V5.8, V6, V6.1, and V6.2.
5. **Six-zone wording is historical, and old data can still be six keys.** V4 and the V4.1 note say "Record six net zones." The V4.3 README says "logged by 6-zone target." Those builds had `UL UC UR LL LC LR` only. Current code and the current README do not say six. The loader still has to tolerate a six-key `zones` object.
6. **`weighted` is dead.** Outcome tables were replaced by `outcome`'s formulas. The function and its `Math.random` remain.
7. **The rare 8-run opponent inning is dead.** `rareBigRally` can raise the cap to 8, and the next unconditional `min(5, runs)` undoes it. The later walk-off lead change can still exceed 5.
8. **Playoff tie crowns the opponent.** Regular-season ties change no wins or losses. Playoff ties take the `else` branch and end the season.
9. **League simulation has a permanent bye and fixed pairings.** Seven opponents, adjacent pairs, same order every user game.
10. **Other playoff series are not played.** The second round is "whoever has the most regular-season wins," not a simulated semifinal.
11. **OBP is displayed as a copy of AVG.**
12. **Profile hand does not affect `outcome`.** Batter hand does, and only by `+0.015` on the pull column.
13. **Team rename drops championship credit** that was stored as the old name string.
14. **Legacy short opponent names are deleted on load**, even if the user added them on purpose.
15. **`ensureRoster` replaces a roster whose length is not 9,** wiping counting stats.
16. **Snapshot-after-finish can resurrect the in-progress game** until the next null-game save, and finishing that copy again double-applies season and tournament results.
17. **Reset does not delete the snapshot.** Until the next save, restore brings the pre-reset career back. The reset confirm says the reset is permanent.
18. **A present but invalid `KEY` hides a valid v3 save.**
19. **v2 fields other than the copied list are dropped.** Hits are not split into singles and extra-base hits.
20. **Dates use `toLocaleDateString()`.** The same game can export a different `date` string on a different locale. Daily buckets use a manual `YYYY-MM-DD` instead, so the two clocks do not match in format.
21. **`practice.days` grows forever.** History is capped; days are not.
22. **`autoWinners` and the `team-leader` CSS class are unused.**
23. **No `prefers-reduced-motion` handling,** and no animation to reduce. The deprecated Apple web-app meta is still on line 1.
24. **Viewport `viewport-fit=cover` is set, and no CSS uses `safe-area-inset`.** On a notched phone the header can sit under the status bar.
25. **Service worker `cache.put` is not tied to `waitUntil`.** A response can fail to cache if the worker is stopped immediately. Offline fallback then misses that request.
26. **Pages `max-age=600`** can sit in front of the network-first worker.

No `TODO` or `FIXME` comments are in the five files.

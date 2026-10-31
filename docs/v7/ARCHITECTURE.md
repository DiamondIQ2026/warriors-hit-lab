# Warriors Hit Lab V6.3 architecture

This is a read of the code at `489ccf8` (`v7/phase1-foundation`, same tree as `main` and the annotated tag `v6.3-baseline`). It is the app GitHub Pages serves from `main` at `https://diamondiq2026.github.io/warriors-hit-lab/`. On 2026-10-31 the five live files were byte-identical to this commit (`Last-Modified: Sun, 18 Oct 2026 15:28:02 GMT`). No app code was changed for this audit.

The product is one static site with no build, no `package.json`, and no CI. `index.html` is 91,089 bytes and 291 lines: inline CSS, the screens, and one strict-mode IIFE. The script is about 55 KB, from line 156 through the closing `})();` on line 291. `sw.js` (722 bytes, one line), `manifest.webmanifest`, `icon.svg`, and `README.txt` complete the site.

## How this differs from the 2026-10-22 baseline

The earlier audit (`uploads/STATUS_BASELINE_2026-10-22.md`) is right about the live commit, the five-file layout, the storage keys, the 9-zone loop, and the lack of a ball-flight demo. These points needed correction after reading the file and the history:

- There are **11** `Math.random` expressions, as that audit said. Two of them share line 164 (`rand` and `weighted`). `weighted` itself is now unused. Out wording adds more rolls through `pick` → `rand`.
- A tied tournament game is **not** stored as a career loss. The bracket gives the game to the opponent, but the career counter records a tie. See `SYSTEMS_INVENTORY.md`.
- "Six net zones" is historical. V4 through V4.5 (`8dbe1bf` through `ee92f1c`) really had six buttons and said so in the README. The 3×3 net arrived in V5.0 (`c3cabc4`). The current README does not mention six zones. The string `6-zone` is not in the current `index.html`.
- README titles lag the notes in the body for V4.1 (`7d40b6b`), V5.1 (`d25ea9f`), and V6.1 (`5e09c0a`). There is still no commit whose title is V4.2, V5.4, V5.5, or V5.9. V5.9 is only a phrase in the V6 README. V4.2 is only a CSS comment.
- Since that audit, tag `v6.3-baseline` (annotated, points at `489ccf8`) and branch `v7/phase1-foundation` exist. `main` is still the Pages source (`path: /`). This audit does not move the tag or `main`.

## Screens and navigation

There is no router and no URL hash. Navigation hides and shows sections. The header (line 129) is always visible: eyebrow, title, the subtitle `#subtitle`, and the level pill `#level`. Until a profile exists, only `#setup` (line 130) is shown. After that, `#app` (line 131) is shown and `#setup` is hidden. Editing the profile (`showProfile`, line 287) brings `#setup` back and hides `#app`.

| Surface | DOM | Lines | What it is |
|---|---|---|---|
| Create / edit profile | `#setup` | 130 | Name (max 32), jersey (max 3), hand `L` or `R`, team name (max 24, default "Tampa Warriors") |
| Desktop tabs | `nav.tabs` | 131 | Play, Career, Team, Season, Tournament, Settings. Visible above 700px |
| Phone menu | `#menuToggle`, `#mobileMenu` | 131, CSS 85–92 | Same six destinations. Replaces the tabs at `max-width: 700px` |
| Play | `#tab-play` | 132–141 | Final score, pregame, the live game, and the play-by-play log |
| Final score | `#finalScreen` | 133 | Inside Play. Shown when `d.showFinal` and `d.lastFinal` are set and no game is in progress |
| Pregame | `#pregame` | 134 | Mode, daily challenges, mode overview, start, innings, quick-play opponent |
| Live game | `#activeGame` | 135–139 | Score, bases, batter, 3×3 net, Hard / Medium / Soft, undo, forfeit |
| Play-by-play | the log panel in Play | 140 | Last 22 of `d.log` |
| Career | `#tab-career` | 142 | Level, simulated totals, zone counts, real-tee panel, daily challenges, 24 achievements, last 25 games |
| Team | `#tab-league` | 144–145 | Batting order, individual batting table, opponent list. The tab id is `league`; the label is "Team" |
| Season | `#tab-season` | 146 | New-season form or the active season, standings, past seasons |
| Tournament | `#tab-tournament` | 143 | Bracket size, innings, bracket, history |
| Settings | `#tab-settings` | 147–154 | Profile edit, arcade/balanced, audio, snapshot, export, import, reset |

`tab` (line 259, body continues with the menu helpers) sets `currentTab`, marks the matching `[data-tab]` buttons, writes `#menuCurrent`, closes the phone menu, and toggles `.hidden` on `#tab-play`, `#tab-career`, `#tab-league`, `#tab-season`, `#tab-tournament`, and `#tab-settings`. A refresh always starts on Play (`currentTab` defaults to `'play'`). The saved game is still there.

`render` (line 279) decides which Play sub-screen is visible:

- a game in progress shows `#activeGame` and hides pregame and the final screen
- no game, and `showFinal` plus `lastFinal`, shows `#finalScreen`
- otherwise it shows `#pregame`

Season setup versus the active-season panel is the same idea: `#seasonSetupPanel` is hidden while `d.season` exists and `phase !== 'done'`.

The phone menu is a button plus a `nav`, not a route. `closeMenu` (line 259) and the toggle handler (line 290) only flip `.hidden` and `aria-expanded`.

## State model

Almost everything lives on one mutable object, `d`, declared with `let d = fresh()` on line 156. Three other variables are not saved:

| Variable | Role |
|---|---|
| `selected` | The net zone waiting for a contact button. `null` until a zone is tapped |
| `currentTab` | Which section is visible. Lost on refresh |
| `undoState` | A deep copy of the last swing. Memory only. Lost on refresh, on the third out, and when the game ends |
| `audioContext` | Lazy Web Audio context (line 238). Not saved |

`fresh` (line 156) is the empty career: `version: 4`, empty history and stats, team `"Tampa Warriors"`, the 25 opponent names, and `game: null`. It does **not** include `roster`, `preferences`, `practice`, `playerSeasonStats`, `lastFinal`, `lastAwards`, or `showFinal`. Those are added by the normalizers on lines 156–163 before the first real session, or later when a game ends. `reset` writes a bare `fresh()` and relies on the next page load to fill the gaps. The full stored shape is in `SYSTEMS_INVENTORY.md`.

`render` is not a pure function. It reads `d` and writes the DOM, and it also:

- calls `todayData` (via `renderPractice`), which creates today's practice bucket if it is missing
- calls `save()` as its last step, but only when a player exists. The early `if (!has) return` on line 279 skips that save on the create-profile screen

So opening the app, switching tabs, and finishing a swing all rewrite `localStorage`.

## Render approach

The page is server-rendered HTML plus imperative updates. There is no virtual DOM and no template library. `render` (line 279) pushes `d` into elements with `textContent`, `classList`, and a few `innerHTML` writes (career stat tiles, zone tiles, standings). User-controlled strings that go through `innerHTML` are passed through `safe` (line 164), which escapes `& < > " '`. Roster rows, achievements, and the bracket are built with `createElement` inside `renderRoster` (286), `renderLegends` (189), and `renderTournament` (194).

`render` always calls `renderLegends`, `renderPractice`, `renderRoster`, `renderIndividualStats` (281–285), `renderTournament`, and `renderModeOverview` (259–278), even for the hidden tabs. Roster inputs are destroyed and recreated on every render, and their `onchange` handlers are rebound there. The net and contact buttons are static HTML, so their handlers are bound once at startup (line 290).

The result of a swing is a text card, not a drawing. `swing` sets `#event` to an `.outcome-title` and `.outcome-details` (the assignment is in the swing body, lines 250–259). CSS classes `result-hit` and `result-out` recolor the card (lines 46–50). There is no `<canvas>`, no requestAnimationFrame loop, and no `prefers-reduced-motion` rule. The diamond is four rotated squares (`#b1`, `#b2`, `#b3`, and a static home square); `.on` fills a base.

## Event handling

Handlers are assigned with `.onclick` / `.onchange` / `.onkeydown` near the bottom of the IIFE (lines 287–290). The service worker uses `addEventListener`. Nothing else does. There is no event-delegation layer.

| Control | Handler | Lines |
|---|---|---|
| Zone buttons `[data-zone]` | set `selected`, then `render` | 290 |
| Contact buttons `[data-power]` | if `selected`, `swing(selected, power)` | 290 |
| `#undoSwing` | `undoSwing` | 290 |
| `#forfeit` | confirm, then `finishGame(true)` | 290 |
| `#start` | `startGame` | 290 |
| `#playNextSeason` | force season mode and `startGame` | 290 |
| `#playTournament` | force tournament mode and `startGame` | 290 |
| `#newSeason`, `#newTournament`, `#addTeam` | `makeSeason`, `startTournament`, `addTeam` | 290 |
| `#gameMode`, `#playerStatsView` | re-render | 290 |
| Tab buttons `[data-tab]` | `tab`, then `render` | 290 |
| `#menuToggle` | open or close `#mobileMenu` | 290 |
| `#saveProfile` / `#editProfile` | `setProfile` / `showProfile` | 290 |
| Audio controls and `#quickMute` | write `d.preferences`, `save`, `render` | 287–290 |
| `#exportSave` / `#importButton` / `#importFile` | `backup` / file picker / JSON import | 287–290 |
| `#restoreSnapshot` | read the snapshot key | 289 |
| `#reset` | confirm, replace `d` with `fresh()` | 290 |
| `#finalContinue` | `showFinal = false`, back to Play | 290 |
| Roster inputs | inside `renderRoster` | 286 |

Contact buttons start `disabled` in the HTML (line 139). `render` sets `disabled` on every `[data-power]` unless a game exists and a zone is selected. Undo is disabled unless `undoState` and `d.game` are both set.

Startup (lines 290–291): if there is no player, `showProfile()`; then `render()`; then, only when `location.protocol === 'https:'`, `navigator.serviceWorker.register('./sw.js')`. Plain HTTP, including a typical local preview, does not register the worker.

## Simulation engine

One real swing is one plate appearance. There are no balls, strikes, walks, strikeouts, errors, or stolen bases. The kid taps a zone and a contact, and `swing` (lines 250–259) records the result.

### Inputs

`outcome(zone, power, batter)` (lines 164–179) takes:

- **Zone.** Two letters. Row is `zone[0]` (`U`, `M`, `L`). Column is `zone[1]` (`L`, `C`, `R`). The nine buttons are on lines 136–138: `UL UC UR / ML MC MR / LL LC LR`. The comment on line 168 says a net coordinate is not a measured field direction.
- **Contact.** `'hard'`, `'medium'`, or `'soft'`.
- **Batter.** Defaults to `d.roster[d.game.lineupPos]`. Ratings used here are `contact`, `power`, `speed`, `clutch`, and `hand`. The profile's own hand (`d.player.hand`) is display-only. Each of the nine batters has a hand, and that is what the engine uses.
- **Context.** The current game's inning, scheduled length, and score. Missing game, the late boost is skipped.
- **Play style.** `d.preferences.style`, default `'arcade'`.

### Hit or out

Base chance: hard `0.60`, medium `0.40`, soft `0.16`.

Then:

| Adjustment | Amount |
|---|---|
| Middle row (`M`) | `+0.06` |
| Upper row (`U`) | `+0.025` |
| Lower row (`L`) | `−0.02` |
| Middle-middle (`MC`) | `+0.095` **in addition to** the middle-row `+0.06`, so `MC` is `+0.155` before the other terms |
| Contact | `(contact − 75) × 0.0014` |
| Pull column | `+0.015` when the column is the pull side. A left-handed batter's pull side is `R`. A right-handed batter's pull side is `L`. The center column never gets this |
| Late trail | Only when `inning >= max(2, innings − 1)` and `score < other`. Add `min(0.14, 0.055 + deficit × 0.012)` plus `(clutch − 70) × 0.00065` |
| Balanced style | `−0.09` after the additions |

The chance is then clamped. The floor is `0.07`. The ceiling is `0.85` when style is exactly `'arcade'`, and `0.76` otherwise. A balanced soft lower-row swing often hits the floor. Any style other than `'arcade'` gets the lower ceiling, and only the exact string `'balanced'` pays the `−0.09`.

The first roll is `Math.random() >= chance` → `'out'` (line 173).

### What kind of hit

`powerFactor` is `(power rating − 30) / 69`, clamped to `0..1` (line 174).

`extra` (line 175) is the extra-base threshold:

- hard `0.31`, medium `0.13`, soft `0.02`
- plus `powerFactor × 0.24`
- plus `0.075` on an upper-row zone, or `−0.06` on a lower-row zone

Second roll, `roll = Math.random()` (line 176):

- `roll >= extra` → `'single'`
- else if `roll < homer` → `'homer'`
- else if `roll < homer + 0.055 + (speed − 65) × 0.00035` → `'triple'`
- else → `'double'`

Home-run window (line 177): hard `0.09 + powerFactor × 0.18`, medium `0.015 + powerFactor × 0.035`, soft `0`. Soft contact never returns `'homer'` from this function. Speed only affects the triple window. It does not change baserunning.

### Every `Math.random` use

Direct expressions in `index.html`:

| # | Lines | Who | What the roll does |
|---|---|---|---|
| 1 | 164 | `rand(a, b)` | `a + floor(Math.random() × (b − a + 1))`. Inclusive integer range |
| 2 | 164 | `weighted` | One roll to pick from a weight table. **Nothing calls `weighted` in V6.3.** It is leftover from the V4–V4.5 outcome tables |
| 3 | 173 | `outcome` | Hit versus out |
| 4 | 176 | `outcome` | Single versus extra bases |
| 5 | 195 | `startGame` | `homeGame` when the roll is `< 0.65` (about 65% home) |
| 6 | 202 | `simulateHalf` | Three rolls, one per "at-bat." `r < 0.22` adds a run. `r > 0.89` adds a run. A single roll cannot do both, so this loop adds 0 to 3 runs |
| 7 | 209 | `simulateHalf` | Comeback attempt when the opponent still trails by 3 or more after those rolls. Chance is `min(0.93, 0.36 + gap × 0.045 + late × 0.13)` |
| 8 | 210 | `simulateHalf` | `chaseFraction = 0.40 + roll × 0.43 + late × 0.08`. The rally added is `max(1, round(gap × chaseFraction))` |
| 9 | 213 | `simulateHalf` | `rareBigRally` when `late > 0.80` and the roll is `< 0.08`. The next line allows 8 runs in that case, but line 219 then does `runs = min(5, runs)`, so the 8-run branch never survives |
| 10 | 223 | `simulateHalf` | Late lead change. Home game, scheduled final inning only (`inning === innings`, not extras), Warriors lead by 0 to 3, roll `< 0.58`. Sets opponent runs to at least `score + 1 − other`, which can exceed the 5-run cap because it happens after line 219 |
| 11 | 257 | `swing` | Scoring governor, below |

Indirect rolls, all through `rand`:

- `pick` (line 164) chooses one of three out sentences in `describe` (line 180). Hits use fixed sentences. Every out in the log depends on this roll.
- `shuffle` (line 164) is Fisher–Yates via `rand`. Used for the seven season opponents and the tournament field.
- `startTournament` (line 191) shuffles the field again with `rand`.
- `generateTournamentRound` (line 192) rolls two integers in `0..9` for every CPU match. Winner is the higher roll, ties going to the first team (`x >= y`). The displayed score is `(max + 1)–min`, so CPU matches are never stored as ties. A 0–0 roll becomes 1–0.
- `simulateLeagueRound` (line 231) does the same `0..9` pair for other league games, then if the rolls tie it increments the first. That can make a score of 10. The last opponent in an 8-team league never plays these games (seven opponents, pairs of two, one team left over, and the pairing does not rotate).

No seed is stored. `Math.random` is not injected. A test cannot replay a game without replacing `Math.random` from the outside.

### Scoring governor

Inside `swing`, after `outcome` returns (lines 251–258):

```
lateComeback = inning >= scheduled innings && score <= opponent
damp = 0.92 if this inning already has 5+ runs
       0.70 if 4+
       0.34 if 3+
       0 otherwise
if not lateComeback and the swing was a hit and Math.random() < damp:
    kind = 'out'
```

The skip covers the scheduled last inning **and extras**, and it covers a tie as well as a deficit (`score <= other`). It does not look at the early-game comeback boost. Those are different windows. A 3-inning game starts the hit boost in inning 2 (`max(2, innings − 1)`), but the governor stays on until inning 3.

The governor does not change the zone tap or the contact tap. `practiceSwing` and `d.zones` have already been updated. A hard middle-middle that the governor turns into an out is still a hard middle-middle in the real-tee log, and an out in the batting line.

### Applying the result

`baserun(bases, kind)` (line 180) is deterministic. A single, double, triple, or homer advances every runner by 1, 2, 3, or 4 bases. Anyone who would pass home scores. The batter occupies the base that matches the hit, or scores on a homer. Runners never take an extra base, and hits never make extra outs.

`swing` then updates, in order: season-player row (season mode only), roster counting stats, the game batting line, career `d.stats` (including the contact bucket `hard` / `medium` / `soft`), bases, score, `inningRuns`, RBI, lineup index `(lineupPos + 1) % 9`, and XP. Per-swing XP is out 3, single 15, double 25, triple 35, homer 55.

A walk-off is a home game, inning at or past the scheduled length, a hit, and the new score ahead of the opponent. That sets `walkoff` and calls `finishGame`. Otherwise three outs call `inningEnd`. Otherwise `save` and `render`.

`describe` (line 180) builds the sentence the child sees. The log line is half, inning, at-bat number, zone code, batter name, sentence, runs, and XP (kept to 75 entries by `log`, line 164).

## Base running, innings, end of game

`startGame` (line 195) refuses to start if `d.game` is already set. Season mode needs `seasonMatch` (line 195). Tournament mode needs `tournamentMatch` (line 190). Quick play uses `#opponentSelect` and `#inningsSelect` (3, 6, or 9). Season and tournament innings come from the season or the bracket, and those two selects are disabled while that mode is chosen.

The new game starts 0–0, inning 1, no outs, empty bases, `lineupPos` 0, `inningRuns` 0. If the Warriors are home, `simulateHalf` runs immediately and the log says they bat in the bottom of the first. If they are away, they bat in the top and the opponent's half is simulated later.

`simulateHalf` (lines 195–231) adds runs to `g.other` only. It does not create at-bats for the user. Order of operations:

1. Three-roll baseline, 0–3 runs.
2. If the Warriors still lead by 3 or more, a comeback roll may add a rally. The code comments describe rare 8-run innings. Line 219 then caps the total at 5, which deletes that 8-run result.
3. In a home game's scheduled last inning, if the Warriors lead by 0–3, a 58% roll can set the visitors ahead by one so the bottom of the inning is a walk-off chance. This cap-break is intentional in the comment on lines 217–222.
4. Five or more runs log "COMEBACK RALLY!". Three or four log a rally sentence.

`inningEnd` (lines 244–250):

1. Away game: simulate the opponent's bottom half now.
2. If this inning is at or past the scheduled length and the score is not tied, `finishGame`.
3. If this inning number is at least `innings + 3`, `finishGame` even when tied. A 3-inning game can still be going in innings 4, 5, and 6. After inning 6 the game ends, tie allowed.
4. Otherwise increment the inning, clear outs, bases, at-bat count, and `inningRuns`, and set `undoState = null`. Undo cannot cross an inning. That matches the old V4 limitation note.
5. Home game: simulate the opponent's top half. If the new inning is past the scheduled length and the Warriors are already ahead, the game ends without them batting again.

`finishGame(forceLoss)` (line 243):

- Result is `WIN`, `LOSS`, or `TIE` from the score, or `LOSS` when forfeiting. A forfeit raises the opponent to at least one run ahead.
- Tournament ties are then broken, but the `result` string is **not** recomputed. Details are in the inventory.
- Career `games`, `wins` / `losses` / `ties`, and game XP: win 110, loss 35, tie 60.
- Season mode adds this game's batting line onto `seasonStats[seasonNumber]` and increments that row's `games`.
- The game is pushed onto `completed` (max 100), then `processSeason`, `processTournament`, and `archiveSeason`.
- `lastAwards`, a sound, a spoken call, `lastFinal`, and `showFinal` are set. `d.game` becomes null. `undoState` becomes null. Then save, switch to Play, render.

Forfeit uses the same function, so a forfeited season or tournament game still moves the standings or the bracket.

## Service worker and caching

`sw.js` is one line.

- Cache name: `warriors-hit-lab-v6-3-team-cleanup`.
- Precache list: `./`, `./index.html`, `./manifest.webmanifest`, `./icon.svg`. `README.txt` is not in the list.
- `install` opens that cache, `addAll`s the list, and `skipWaiting()`.
- `activate` deletes every other cache whose name starts with `warriors-hit-lab-`, then `clients.claim()`.
- `fetch` ignores non-GET. For GET it tries the network. A same-origin response with `r.ok` is copied into the cache (the `cache.put` is not awaited). Any network failure uses `caches.match`. A live HTTP error such as a 404 is returned as-is and is not replaced by the cache.

The strategy is network-first with an offline fallback. It is not cache-first. Combined with `skipWaiting` and `claim`, a newly installed worker takes control without a second reload, but the document that is already open keeps running its old JavaScript until the next load.

The cache name did change between V6.2 (`warriors-hit-lab-v6.2-team-cleanup`) and V6.3, so this particular update does open a new cache. The suffix `team-cleanup` still describes the V6.2 directory change, not individual season stats. Older punctuation is mixed (`v6.1-0`, `v6.2`, `v6-3`). V5.8 (`ac18816`) shipped a README and UI change without changing the cache name, which was still `warriors-hit-lab-v5-7-mode-overview`.

Registration is HTTPS-only (line 290). The manifest (16 lines) is a standalone PWA named "Warriors Hit Lab - Full Team Career", `start_url` `./`, theme `#09172d`, background `#071225`, one maskable SVG icon. `index.html` line 1 still uses the deprecated `apple-mobile-web-app-capable` meta.

GitHub Pages for this repo is `main` at `/`, and the live response observed during this audit carried `cache-control: max-age=600`. Even a network-first worker can be handed a copy Pages has cached for up to ten minutes.

## Function index

Lines are `index.html`. Several functions share one long line, so a range means "this function's source occupies these lines," and a single line number means the whole function is on that line together with its neighbors.

| Lines | Functions |
|---|---|
| 156–160 | Keys, `defaultStats`, `fresh`, `valid`, load, migrate, field normalizers |
| 161 | `makeRoster` |
| 162–163 | `ensureRoster`, and the call to it |
| 164 | `save`, `rand`, `pick`, `shuffle`, `weighted`, `safe`, `log`, `level`, start of `outcome` |
| 165–179 | Rest of `outcome` |
| 180 | `baserun`, `describe`, `newStandings`, `seasonKey` |
| 181 | `trackedSeason` |
| 182–188 | `legendAchievements` and its inner `max` |
| 189 | `renderLegends` |
| 190 | `archiveSeason`, `makeSeason`, `tournamentMatch` |
| 191 | `startTournament` |
| 192 | `generateTournamentRound` |
| 193 | `processTournament` |
| 194 | `renderTournament` |
| 195 | `seasonMatch`, `startGame`, start of `simulateHalf` |
| 196–231 | Rest of `simulateHalf`, then `updateStanding`, `simulateLeagueRound`, `processSeason` |
| 232 | `localDay` |
| 233 | `todayData` |
| 234 | `challenges` |
| 235 | `practiceSwing` |
| 236 | `addStat` |
| 237 | `renderPractice` |
| 238–241 | `audioContext`, `soundEffect`, `speakCall`, `postgameHighlights` |
| 243 | `finishGame` |
| 244–250 | `inningEnd`, start of `swing` |
| 251–259 | Governor and the rest of `swing`, then `undoSwing`, `closeMenu`, `tab`, start of `renderModeOverview` |
| 260–278 | Rest of `renderModeOverview` and its inner `node` and `heading` |
| 279 | `render` |
| 280 | `seasonPlayerEntry` |
| 281–285 | `renderIndividualStats` and its inner `statsFor` |
| 286 | `renderRoster` |
| 287 | `ordinal`, `fmt`, `fmtPct`, `showProfile`, `setProfile`, `addTeam`, `backup`, start of the listeners |
| 288–290 | The rest of the listeners, import, reset |
| 291 | End of the IIFE and the document |

`level` is `1 + floor(xp / 250)` (line 164). The progress bar is `xp % 250`.

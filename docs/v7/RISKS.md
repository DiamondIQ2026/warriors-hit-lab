# Risks of moving Warriors Hit Lab to V7

Each risk is about the upgrade from the V6.3 tree at `489ccf8`, not a generic software list. Likelihood and impact are High, Medium, or Low for this app and this audience: a phone, one browser profile, kids' careers that exist only in `localStorage`.

The standing constraint is priority 8: existing single-player modes and saved careers keep working. Several risks below are ways that constraint gets broken by accident.

## 1. Data loss during save migration

**Likelihood:** High, if `version` becomes `5` and a phone later opens the current file. Medium, if new fields are added beside the old ones and the loader is tested against real fixtures.

**Impact:** High. The career is the product. There is no server copy.

**What goes wrong.** `valid` (index.html line 156) accepts only `version === 3` or `version === 4`. If V7 writes `version: 5` into `warriors-hit-lab-v4` and the phone later runs V6.3 (a rollback, a cached `index.html`, or a second tab), `valid` fails. The loader then ignores a non-empty v4 value and does **not** fall back to `warriors-hit-lab-v3`. It may apply a leftover career-v2 object, or it starts from `fresh()`. The next `render` or `reset`-style save writes that empty career over `KEY`. The good JSON is gone except for the one snapshot slot, and only if the snapshot still passes `valid`.

Other loss paths that already exist and that a migration can make worse:

- The v2 reader copies eight ideas (`xp`, record, `ab`, `hits` → `h`, `hr`, `bestStreak`, `teams`, `history`) and drops everything else.
- `ensureRoster` replaces the roster when the length is not 9.
- Load rebuilds `teams` and deletes the six legacy short names.
- `practice.history` is cut to 3,000 only when a swing is recorded, but a migration that "cleans" arrays can cut earlier.
- `JSON.stringify` of a partially normalized object (the current `reset` path) can be exported and then rejected on import because `player` is null.

**Mitigation.**

- Keep every existing key. Add keys. Do not rename `stats`, `roster`, `season`, `player`, or `playerSeasonStats`, and do not wrap them in a new parent object.
- Do not write `version: 5` into `KEY` until V6.3's `valid` on the **Pages** origin accepts that integer, or store the logical schema in a new field (`appSchema: 5`) and leave `version` at `4`. The second option loads in today's `valid` with no production patch. Unknown keys are preserved by today's loader. See the migration design in `V7_IMPLEMENTATION_PLAN.md`.
- Before the first V7 write, copy the raw `KEY` string into the snapshot (and into a one-time `warriors-hit-lab-premigration` key) so a bad migrate can be restored.
- Run the fixture suite and the "migration never drops a career field" property before any schema write ships. Include a save taken from a real phone if the owner can export one. The drafted fixtures are not a substitute for that file.
- Import stays a replace, with the confirm, and it should refuse a file that does not contain the career counters.

## 2. iOS Safari evicting localStorage, and private mode

**Likelihood:** Medium for eviction on a phone that does not open the app for days. High for data loss if someone plays in a private tab. High that a full or disabled store happens at least once in the life of a family phone.

**Impact:** High for eviction and private mode (the whole career). Medium for a single failed write (the game continues in memory and dies on refresh).

**What goes wrong.** The only durable copy is `localStorage` on that origin. Safari has thrown away script-writable storage for sites that were not used, including home-screen web apps in past iOS versions. A private tab often gives a store that throws or that disappears when the tab closes. `save` catches that and writes one sentence into `#saveMessage` on the Settings tab. A child on the Play screen is not told in a way they will see. The snapshot is in the same store, so eviction takes both. Export is a manual download the current README already asks for, and nothing in the app schedules it.

V7 makes this worse if the save grows without a cap: `playEvents` for every swing, plus `practice.days` which is already unbounded. Mobile Safari's `localStorage` ceiling is small (on the order of 5 MB). A long career plus a full event log can start failing `setItem` in the middle of a game.

**Mitigation.**

- Keep the career save small. Put bulky logs in a second key so a quota failure on the log cannot block the career write. Cap `playEvents` the way `completed` is capped (100) unless the owner chooses a larger cap on purpose.
- Cap or roll up `practice.days`.
- If `setItem` throws, show the failure on the screen the child is looking at, and keep the in-memory game playable for the rest of the session.
- Say, in the product, to add the app to the Home Screen and to export from Settings after a season. Do not add an account or a server. The owner has ruled those out.
- Test in a real private tab and after a storage wipe. Automated Playwright cannot prove Safari's seven-day eviction.

## 3. The service worker serving stale code after an update

**Likelihood:** High if a release forgets to change the cache name (this already happened at V5.8). Medium on every release even when the name changes, because of `skipWaiting`, Pages' `max-age=600`, and iOS worker quirks.

**Impact:** Medium most of the time (old UI for one session). High if the stale script and a new save schema disagree, which is the migration risk above.

**What goes wrong.** `sw.js` is network-first, then cache. That is the right default, and it is not a fix by itself.

- The open page keeps the old IIFE until a reload. `clients.claim()` does not reload documents.
- `install` + `skipWaiting` activates a new worker immediately. `activate` deletes every other `warriors-hit-lab-*` cache. If `addAll` failed, the device can be left with no cache and, while offline, no page.
- `cache.put` is not passed to `waitUntil`. A busy phone can drop the write.
- GitHub Pages responded with `cache-control: max-age=600` during this audit. The worker's "network" response can be a ten-minute-old file.
- V6.3's cache id is `warriors-hit-lab-v6-3-team-cleanup`. The suffix does not describe V6.3. A later edit that copies `sw.js` and forgets the constant will ship silent stale assets, which is the V5.8 mistake (`ac18816` left `warriors-hit-lab-v5-7-mode-overview` in place).
- Rollback to the `v6.3-baseline` worker reopens the old cache name. Devices that are online recover on the next fetch. Devices that are offline keep the newer worker until they are online again.

**Mitigation.**

- Change the cache name in the same commit as any change to `index.html`, the manifest, or the icon. Add a test that fails if those files change and the cache constant does not.
- Keep network-first. Do not switch to cache-first to "make offline faster."
- After `claim`, post a message that asks the page to reload once, only when the build id changed. Do not reload in a loop.
- Await `cache.put` inside `waitUntil`.
- Treat a schema change and a worker change as one release. Never let a new save format outrun the script that can read it.
- The V7 build's asset names should include a content hash, and the worker should precache that manifest. Hashed names make a stale `index.html` the remaining problem, which network-first plus a reload-on-claim covers.

## 4. The single-file monolith and regression risk

**Likelihood:** High, once features land inside the 291-line file. Medium, if the extraction is done first and the current behavior is locked by tests.

**Impact:** High. A bad edit to `swing`, `finishGame`, or `save` corrupts a live career. There is no review surface today: every historical commit message is `Add files via upload`, and the script is long lines (line 279 alone is the entire `render`).

**What goes wrong.** Season totals, the governor, undo, and the save normalizer are interleaved on the same lines. A V7 animation or a second profile added in place will change a shared variable (`d`, `selected`, `undoState`) and the single-player path will move with it. CSS already has several layers that override each other (`#activeGame .zone` is set again and again from V4.2 through V5.1). A new visual layer can break the 44px contact targets on a short phone without touching the engine.

**Mitigation.**

- Do not add V7 features to the IIFE. Extract modules first, with no intended behavior change, and make the baseline tests pass on the extracted code.
- Keep `outcome`, `baserun`, `inningEnd`, `finishGame`, and the migrator free of DOM.
- One PR per phase. The owner can reject a phase without taking the next one.
- Visual checks at 375×667 and 393×852, because that is where the current CSS is doing its real work.

## 5. Unseeded randomness makes the rules untestable

**Likelihood:** Certain, until `Math.random` is behind a function tests can replace. The file has 11 direct call sites, plus `pick` → `rand` for out wording, plus shuffles.

**Impact:** High for the upgrade. Without a seed, a regression in the governor or the tie rules shows up as "sometimes." The owner asked for deterministic, seeded, unit-tested play.

**What goes wrong.** `outcome` uses two rolls, `simulateHalf` uses three to six, `startGame` uses one, the governor uses one, and CPU bracket games use `rand`. There is no seed on the game object. A golden test cannot name an expected at-bat. Monte Carlo checks can lock probabilities only with a large sample, and they will flake if someone tightens a threshold by 0.01.

Replacing `Math.random` with a seeded generator changes the sequence of future swings. It does not change the formulas. Old completed games stay whatever they were. An in-progress game that continues under the new generator simply gets its next rolls from the new stream. That is acceptable only if the formulas are unchanged and the seed is stored on the game so a test can replay it.

**Mitigation.**

- One `rng.next()` used everywhere `Math.random` and `rand` are used today, including `pick`.
- Tests pass a scripted sequence for exact results, and a seeded generator for replay tests.
- Record the seed and the draw index on the game and on each `PlayEvent`.
- Do not call `Math.random` inside the animator. The animation plays the result `swing` already stored.

## 6. Animation performance on older iPhones, and reduced motion

**Likelihood:** Medium on older phones if the animation is a canvas loop or a large GIF. Low if it is a short CSS/SVG sequence with a static fallback. Certain that reduced motion is currently ignored, because the stylesheet has no `prefers-reduced-motion` rule and the script never reads `matchMedia`.

**Impact:** Medium. A stuttering animation sits on the critical path of every swing. A child who cannot skip it will stop using the app. An animation that drops frames must still not be allowed to delay or replace the save. The save already happens inside `swing` before any future animation should start.

**What goes wrong.** The current result UI is a text card (`#event`). It is cheap. A full-screen 2D scene after every swing, on an iPhone SE class GPU, can miss frames if it replays layout (the current `render` already rebuilds the roster and both challenge lists on every swing). Running that rebuild in the same frame as a canvas draw will hitch. iOS low-power mode and Reduced Motion are common on kids' phones. The net zones are not a trajectory. An animation that draws a ball flight as if the zone were exit velocity would invent a measurement the app does not have. The on-screen hint (line 135) and the career hint (line 142) already say the zones are impact location, not field direction.

**Mitigation.**

- Persist the result first. Start the animation only after `save` returns.
- The scene reads `kind`, runs, and the batter name from the saved event. It does not call `outcome`.
- Skip control is always present. `prefers-reduced-motion: reduce` skips the motion and shows the same card V6.3 shows now.
- Budget the scene for the SE viewport (375×667). No per-frame DOM work, and do not call full `render` until the scene is done or skipped.
- Manual check on a real older iPhone is required. A desktop Playwright trace can catch a broken skip button and cannot prove the GPU budget.

## 7. Multiplayer state corrupting single-player careers

**Likelihood:** High if the second profile is another flag on `d`. Low if it is a different `localStorage` key and a different object that `save` never writes to `KEY`.

**Impact:** High. A local "Dad / Tampa Titans" game that increments `d.stats`, `d.roster`, `d.xp`, `d.season`, or `d.tournament` permanently mixes two people into one career. Undo will not save it: undo does not run after the game ends, and season totals are applied in `finishGame`.

**What goes wrong.** Today there is one object and one key. `finishGame` always updates that object. A boolean `multiplayer: true` that someone forgets to check in `processSeason` or `practiceSwing` is enough to corrupt the season. Import replaces the whole career, so importing a multiplayer file through the current importer would also wipe the child. The snapshot is a single slot; a multiplayer save that goes through `save` while `game` is null would overwrite the child's recovery copy.

**Mitigation.**

- New key, for example `warriors-hit-lab-local-mp-v1`. The career loader never reads it. `valid` on the career path ignores it.
- Multiplayer games call a different finish function. They do not call `processSeason`, `processTournament`, `practiceSwing`, or the career XP table. If the owner wants multiplayer tee swings to count as real-tee practice, that write goes to an explicit real-tee store with a `source: "multiplayer"` field, not to `d.stats`.
- Separate export files, or one export with two named sections that import cannot confuse.
- A test loads a populated career, plays a full multiplayer game, and asserts the career JSON is deep-equal except for keys the test listed in advance. The list starts empty.

## 8. Mixing real tee stats with simulated stats

**Likelihood:** High. The mix already exists, and every V7 feature (animation, pitch challenge, approach guide, academy) will be tempted to read `d.stats` because it is the number on the Career tab.

**Impact:** High for trust. The mission is more quality real swings. A batting average that moves because the governor flipped a hit, or because arcade mode added 0.09 of hit chance, is not a tee-work score. A child who "raises their average" by picking Hard and middle-middle is playing the simulator. That can be fun. It is a different fact from contact quality.

**What is already true.**

- `practice.history` stores `{ date, zone, power }` and does not store the simulated kind.
- `d.stats` and the roster store the kind **after** the governor.
- Both update from the same tap.
- The UI puts them on one Career page, with a hint that is easy to miss.
- Quick play updates career batting and real-tee history together.

**Mitigation.**

- A `realTee` record written from the tap, never from `kind`. The governor may change only the simulated half of the `PlayEvent`.
- Simulated screens say "simulated" in the heading, not only in a footer paragraph.
- Real-tee screens show zone, contact, middle-middle rate, hard-contact rate, called-location hits, and drill completion. They do not show AVG, HR, or RBI.
- Academy and the approach guide are allowed to read `realTee` and the batter's stated hand. They are not allowed to read `outcome` or to say anything about swing mechanics (no "late hands," no "drop the barrel").
- The pitch-location result is a real-tee fact (called zone versus tapped zone). Whether it also changes the simulated hit chance is an owner decision. The default in the plan is no.

## 9. The build step changing the Pages deploy

**Likelihood:** Medium the first time a bundler is introduced. Low afterward if Pages stays on raw `main` until the owner switches it.

**Impact:** High. Pages source for this repo is branch `main`, folder `/`. Whatever is on `main` is the kids' app within about a minute, plus the CDN window. A Vite build that emits absolute `/assets/...` URLs will 404, because the site is `https://diamondiq2026.github.io/warriors-hit-lab/`, not the domain root. The current document uses relative `./` links. A build that overwrites `index.html` with a loader and expects a server rewrite will break offline as well, because the worker precaches `./index.html` and the manifest and the icon only.

**Mitigation.**

- The foundation build emits a **relative** `base` (`./`).
- CI does not have `pages: write` and does not push to `main`. The workflow file should not contain a deploy job at all.
- Production Pages keeps serving the five raw files until the owner approves a switch. Preview is an Actions artifact or a separate preview branch that is not the Pages source.
- The service worker that ships with the built output precaches the built file list, not the old four paths, and it uses a new cache name.
- Rollback is "point Pages back at the `v6.3-baseline` tree," which is still a valid static site with no build.

## 10. The current workflow of uploading straight to main

**Likelihood:** High, until the owner stops using "Add files via upload." All 16 commits on `main` are that message, by `DiamondIQ2026`, and `main` is unprotected. There is no PR in the history.

**Impact:** High. A bad upload is the production site. There is no review, the commit message does not say which version it is, and the only rollback is another upload or a git revert. Tag `v6.3-baseline` now names a known-good tree, which this repo did not have on 2026-10-22. The tag does not stop a later upload.

**Mitigation.**

- V7 work lands on branches off `v7/phase1-foundation` and merges only after the baseline tests pass.
- `main` stays the production bookmark. Do not commit the audit docs to `main` as a side effect. This PR targets `v7/phase1-foundation`.
- The owner keeps the upload right, but the written release rule is: tag the release, do not upload five files over `main` by hand, and do not upload a personal save JSON (the V6.2 README already says that).
- Branch protection is an owner choice on GitHub. This plan cannot turn it on. The recommendation is to require the CI check on `main` once CI exists, and to ban force-pushes. Until that click happens, discipline is the only control.
- Every release tag (`v6.3-baseline` is the model) is an annotated tag on the exact tree Pages serves. Do not move `v6.3-baseline`.

## Smaller risks worth tracking

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `practice.days` plus a full `PlayEvent` log fills the quota | Medium over a long career | High when `setItem` starts throwing | Separate keys, caps, visible error |
| Locale `toLocaleDateString()` makes exported dates unstable | High | Low | Store ISO dates in new fields; keep old `date` strings as they are |
| Team rename breaks championship achievement equality | Medium | Low | Store a team id in new seasons; do not rewrite old strings |
| Odd-team league bye and unsimulated playoffs surprise the owner during a "realism" pass | High if someone "fixes" standings while migrating | Medium | Lock current season rules with tests before any rules change, and ask before changing them |
| Dead `weighted` gets wired back up and double-rolls a swing | Low | Medium | Delete it during extraction, with a test that outcome uses two rolls and not the table |
| Header under the notch (`viewport-fit=cover`, no safe-area padding) | High on current phones | Low | Add safe-area padding in the UI phase and check it on a device |
| Speech and tones fire during a skipped animation or Reduced Motion | Medium | Low | Gate them on the same preference, and on an explicit sounds toggle |

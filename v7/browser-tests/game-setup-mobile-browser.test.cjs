'use strict';
// Synthetic V7-only browser QA; never reads or migrates real V6.3 saves.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

const URL = 'http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
const V7_KEY = 'hitlab-v7-visual-prototype-only';
const LEGACY_KEY = 'warriors-hit-lab-v4';
const LEGACY_SENTINEL = 'synthetic-v6.3-game-setup-browser-sentinel';

const gameFields = s => ({
  mode: s.mode, innings: s.innings, difficulty: s.difficulty,
  rivalName: s.rivalName, homeName: s.homeName,
  home: s.home, away: s.away, inning: s.inning, outs: s.outs,
  reps: s.reps, hits: s.hits, bases: s.bases,
  gameStarted: s.gameStarted, gameFinished: s.gameFinished,
  handoff: s.handoff, rivalryTurn: s.rivalryTurn,
  trainingReps: s.trainingReps, trainingHits: s.trainingHits,
  trainingLog: s.trainingLog
});
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), V7_KEY);
const legacy = page => page.evaluate(key => localStorage.getItem(key), LEGACY_KEY);

for (const [engineName, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
test(`${engineName}: 375px and 390px active game setup cancellation, resume, reload and confirmed restart`, async () => {
  const browser = await engine.launch();
  try {
    for (const [width, height] of [[375, 812], [390, 844]]) {
      const context = await browser.newContext({
        viewport: { width, height }, isMobile: true, hasTouch: true,
        serviceWorkers: 'block'
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await page.goto(URL);
        // Seed only the experimental V7 namespace and an inert legacy sentinel.
        await page.evaluate(([v7Key, legacyKey, sentinel]) => {
          const fixture = {
            screen: 'Home', team: 'Tampa Warriors', mode: 'Family Rivalry',
            ballpark: 'trop', innings: 6, difficulty: 'Veteran',
            zone: 5, contact: 'MEDIUM', outs: 2, inning: 5,
            away: 4, home: 7, reps: 11, hits: 8,
            log: ['synthetic game'], rival: 'Father',
            bases: [true, false, true], feedback: '', animating: false,
            trainingLog: [{ zone: 5, contact: 'HARD', hit: true }],
            trainingReps: 1, trainingHits: 1, trainingFeedback: '',
            gameStarted: true, gameFinished: false, finalReason: '',
            extraInnings: 0, rivalryTurn: 'away',
            rivalName: 'Dad', homeName: 'Maddon', handoff: true,
            rivalryStats: {
              away: { reps: 11, hits: 8 },
              home: { reps: 0, hits: 0 }
            }
          };
          localStorage.setItem(v7Key, JSON.stringify(fixture));
          localStorage.setItem(legacyKey, sentinel);
        }, [V7_KEY, LEGACY_KEY, LEGACY_SENTINEL]);
        await page.reload();
        assert.equal(await page.locator('#resumeGame').count(), 1);
        const before = gameFields(await saved(page));

        await page.locator('[data-go="Play"]').first().click();
        assert.equal(await page.locator('#mode').inputValue(), 'Family Rivalry');
        await page.locator('#mode').selectOption('Exhibition');
        await page.locator('#difficulty').selectOption('All-Star');
        await page.locator('#rivalName').fill('Temporary Dad');
        await page.locator('#rivalName').press('Tab');
        await page.locator('#homeName').fill('Temporary Maddon');
        await page.locator('#homeName').press('Tab');
        await page.locator('[data-innings="9"]').click();
        assert.equal(await page.locator('#mode').inputValue(), 'Exhibition');
        assert.equal(await page.locator('#rivalName').inputValue(), 'Temporary Dad');
        assert.equal(await page.locator('#homeName').inputValue(), 'Temporary Maddon');
        assert.deepEqual(gameFields(await saved(page)), before,
          'staged setup must not alter saved score, bases, inning, handoff or settings');

        await page.locator('button[data-go="Game"]').click();
        assert.equal(await page.getByRole('alertdialog', { name: 'Confirm new game' }).count(), 1);
        assert.deepEqual(gameFields(await saved(page)), before,
          'opening confirmation cannot replace active game');
        await page.locator('#cancelNewGame').click();
        assert.equal(await page.getByRole('alertdialog').count(), 0);
        await page.locator('#resumeGame').click();
        assert.equal(await page.locator('#readyBatter').count(), 1,
          'Family Rivalry handoff must remain pending after cancellation');
        assert.deepEqual(gameFields(await saved(page)), before);

        await page.reload();
        await page.locator('[data-go="Play"]').first().click();
        assert.equal(await page.locator('#mode').inputValue(), 'Family Rivalry',
          'unconfirmed mode must not survive reload');
        assert.equal(await page.locator('#difficulty').inputValue(), 'Veteran');
        assert.equal(await page.locator('#rivalName').inputValue(), 'Dad');
        assert.equal(await page.locator('#homeName').inputValue(), 'Maddon');
        assert.deepEqual(gameFields(await saved(page)), before);

        // Confirming a new game is the ONLY action that may replace game progress.
        await page.locator('#rivalName').fill('New Dad');
        await page.locator('#rivalName').press('Tab');
        await page.locator('#homeName').fill('New Maddon');
        await page.locator('#homeName').press('Tab');
        await page.locator('#difficulty').selectOption('Rookie');
        await page.locator('[data-innings="3"]').click();
        await page.locator('button[data-go="Game"]').click();
        await page.locator('#confirmNewGame').click();
        const restarted = await saved(page);
        assert.equal(restarted.screen, 'Game');
        assert.equal(restarted.mode, 'Family Rivalry');
        assert.equal(restarted.innings, 3);
        assert.equal(restarted.difficulty, 'Rookie');
        assert.equal(restarted.rivalName, 'New Dad');
        assert.equal(restarted.homeName, 'New Maddon');
        assert.equal(restarted.inning, 1);
        assert.equal(restarted.outs, 0);
        assert.equal(restarted.away, 0);
        assert.equal(restarted.home, 0);
        assert.equal(restarted.reps, 0);
        assert.equal(restarted.hits, 0);
        assert.deepEqual(restarted.bases, [false, false, false]);
        assert.equal(restarted.handoff, true);
        assert.equal(restarted.rivalryTurn, 'away');
        assert.equal(restarted.trainingReps, before.trainingReps);
        assert.equal(restarted.trainingHits, before.trainingHits);
        assert.deepEqual(restarted.trainingLog, before.trainingLog);
        assert.equal(await legacy(page), LEGACY_SENTINEL);

        await page.reload();
        assert.deepEqual(gameFields(await saved(page)), gameFields(restarted),
          'confirmed restart must persist across reload');
        assert.equal(await legacy(page), LEGACY_SENTINEL);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true, 'no horizontal overflow at ' + width + 'px');
        assert.deepEqual(errors, [], 'no uncaught browser errors at ' + width + 'px');
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
});
}

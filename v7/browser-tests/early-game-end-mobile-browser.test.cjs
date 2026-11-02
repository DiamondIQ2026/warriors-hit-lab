'use strict';
// Test-only, synthetic V7 browser regression. Never opens or mutates real V6.3 saves.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

const URL = 'http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
const V7_KEY = 'hitlab-v7-visual-prototype-only';
const LEGACY_KEY = 'warriors-hit-lab-v4';
const LEGACY_SENTINEL = 'synthetic-v6.3-early-end-sentinel';
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), V7_KEY);
const legacy = page => page.evaluate(key => localStorage.getItem(key), LEGACY_KEY);
const gameFields = s => ({
  mode: s.mode, inning: s.inning, outs: s.outs, home: s.home, away: s.away,
  bases: s.bases, reps: s.reps, hits: s.hits, log: s.log,
  handoff: s.handoff, rivalryTurn: s.rivalryTurn, rivalryStats: s.rivalryStats,
  gameStarted: s.gameStarted, gameFinished: s.gameFinished,
  trainingReps: s.trainingReps, trainingHits: s.trainingHits, trainingLog: s.trainingLog
});

for (const [engineName, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(engineName + ': 375px/390px early End Game confirmation protects V7 progress and V6.3', async () => {
    const browser = await engine.launch();
    try {
      for (const [width, height] of [[375, 812], [390, 844]]) {
        const context = await browser.newContext({
          viewport: { width, height }, isMobile: true, hasTouch: true,
          serviceWorkers: 'block'
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
          await page.goto(URL);
          await page.evaluate(([key, legacyKey, sentinel]) => {
            const fixture = {
              screen: 'Home', team: 'Tampa Warriors', mode: 'Family Rivalry',
              ballpark: 'trop', innings: 6, difficulty: 'Veteran',
              zone: 5, contact: 'MEDIUM', outs: 1, inning: 3,
              away: 2, home: 4, reps: 11, hits: 8,
              log: ['synthetic swing'], bases: [true, false, true],
              feedback: '', animating: false, gameStarted: true,
              gameFinished: false, finalReason: '', extraInnings: 0,
              handoff: false, rivalryTurn: 'home',
              rivalName: 'Dad', homeName: 'Maddon',
              rivalryStats: {
                away: { reps: 6, hits: 4 }, home: { reps: 5, hits: 4 }
              },
              trainingReps: 2, trainingHits: 1,
              trainingLog: [
                { zone: 5, contact: 'HARD', hit: true },
                { zone: 3, contact: 'SOFT', hit: false }
              ],
              trainingFeedback: ''
            };
            localStorage.setItem(key, JSON.stringify(fixture));
            localStorage.setItem(legacyKey, sentinel);
          }, [V7_KEY, LEGACY_KEY, LEGACY_SENTINEL]);
          await page.reload();
          await page.locator('#resumeGame').click();
          const before = gameFields(await read(page));
          const beforeRaw = await page.evaluate(key => localStorage.getItem(key), V7_KEY);

          await page.locator('#endGame').click();
          const dialog = page.getByRole('alertdialog', { name: 'END THIS GAME EARLY?' });
          assert.equal(await dialog.count(), 1, 'must ask before ending');
          assert.equal(await page.locator('#swing').count(), 0, 'cannot swing behind dialog');
          assert.equal(await page.locator('#cancelEndGame').count(), 1);
          assert.equal(await page.locator('#confirmEndGame').count(), 1);
          assert.equal(await page.evaluate(key => localStorage.getItem(key), V7_KEY), beforeRaw,
            'opening confirmation must not write saved progress');
          await page.keyboard.press('Escape');
          assert.equal(await dialog.count(), 0, 'Escape must dismiss confirmation');
          assert.deepEqual(gameFields(await read(page)), before);

          await page.locator('#endGame').click();
          await page.locator('#cancelEndGame').click();
          assert.equal(await dialog.count(), 0, 'Keep Playing must dismiss confirmation');
          assert.deepEqual(gameFields(await read(page)), before);
          assert.equal(await legacy(page), LEGACY_SENTINEL);

          await page.locator('#endGame').click();
          await page.locator('#confirmEndGame').click();
          const finished = await read(page);
          assert.equal(finished.screen, 'Results');
          assert.equal(finished.gameFinished, true);
          assert.equal(finished.gameStarted, false);
          assert.equal(finished.finalReason, 'Game ended early by player.');
          assert.equal(finished.home, before.home);
          assert.equal(finished.away, before.away);
          assert.deepEqual(finished.bases, before.bases);
          assert.equal(finished.trainingReps, before.trainingReps);
          assert.equal(finished.trainingHits, before.trainingHits);
          assert.deepEqual(finished.trainingLog, before.trainingLog);
          assert.equal(await legacy(page), LEGACY_SENTINEL);
          assert.equal(await page.locator('#resumeGame').count(), 0);

          await page.reload();
          const reloaded = await read(page);
          assert.equal(reloaded.gameFinished, true, 'confirmed result survives reload');
          assert.equal(reloaded.finalReason, finished.finalReason);
          assert.equal(await legacy(page), LEGACY_SENTINEL);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            true, 'no horizontal overflow at ' + width + 'px');
          assert.deepEqual(errors, [], 'no uncaught errors at ' + width + 'px');
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  });
}

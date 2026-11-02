'use strict';
// Isolated V7 Academy browser regression. Synthetic storage only; no V6.3 migration.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
const V7_KEY = 'hitlab-v7-visual-prototype-only';
const LEGACY_KEY = 'warriors-hit-lab-v4';
const SENTINEL = 'untouched-v6.3-academy-browser-sentinel';

async function saved(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), V7_KEY);
}
async function legacy(page) {
  return page.evaluate(key => localStorage.getItem(key), LEGACY_KEY);
}
function trainingFields(s) {
  return { drill: s.drill, trainingReps: s.trainingReps,
    trainingHits: s.trainingHits, trainingLog: s.trainingLog };
}

test('Chromium 375/390px Academy undo, zero-rep resume, corrupt review and explicit replacement', async () => {
  const browser = await chromium.launch();
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
        await page.evaluate(([key, value]) => localStorage.setItem(key, value),
          [LEGACY_KEY, SENTINEL]);
        await page.locator('[data-go="Training"]').first().click();
        await page.locator('[data-drill="Zone Precision"]').click();
        assert.match(await page.locator('h1').innerText(), /Zone Precision/i);
        await page.locator('#swing').click();
        await page.waitForFunction(() => {
          const button = document.querySelector('#swing');
          return button && !button.disabled;
        });
        assert.equal((await saved(page)).trainingReps, 1, 'rep must persist');
        await page.locator('#undoTrainingRep').click();
        let s = await saved(page);
        assert.equal(s.trainingReps, 0, 'undo restores rep count');
        assert.equal(s.trainingHits, 0, 'undo restores hit count');
        assert.deepEqual(s.trainingLog, [], 'undo restores rep log');

        await page.reload();
        await page.locator('[data-go="Training"]').first().click();
        await page.locator('[data-go="Drill"]').click();
        assert.match(await page.locator('h1').innerText(), /Zone Precision/i);
        assert.match(await page.getByRole('progressbar', { name: 'Drill repetitions' }).getAttribute('aria-valuenow') || '',
          /^0$/);

        // Deliberately corrupt only the experimental V7 session, never a real save.
        await page.evaluate(key => {
          const s = JSON.parse(localStorage.getItem(key));
          s.trainingReps = 1;
          s.trainingHits = 1;
          s.trainingLog = [];
          localStorage.setItem(key, JSON.stringify(s));
        }, V7_KEY);
        const corrupt = trainingFields(await saved(page));
        await page.reload();
        await page.locator('[data-go="Training"]').first().click();
        assert.match(await page.locator('#page').innerText(), /SAVED DRILL NEEDS REVIEW/);
        await page.locator('[data-go="Training Results"]').first().click();
        assert.match(await page.locator('[role="alert"]').innerText(), /REPORT PAUSED/);
        assert.doesNotMatch(await page.locator('#page').innerText(), /Zone Performance/);
        assert.deepEqual(trainingFields(await saved(page)), corrupt,
          'review must not repair or discard inconsistent repetitions');

        await page.locator('[data-go="Training"]').first().click();
        await page.locator('[data-drill="Quick Hands"]').click();
        assert.match(await page.locator('#page').innerText(), /REPLACE CURRENT DRILL/);
        await page.locator('#cancelDrillChange').click();
        assert.deepEqual(trainingFields(await saved(page)), corrupt,
          'cancel must preserve the original corrupt session');
        await page.locator('[data-drill="Quick Hands"]').click();
        await page.locator('#confirmDrillChange').click();
        s = await saved(page);
        assert.equal(s.drill, 'Quick Hands');
        assert.equal(s.trainingReps, 0);
        assert.equal(s.trainingHits, 0);
        assert.deepEqual(s.trainingLog, []);
        assert.equal(await legacy(page), SENTINEL, 'V6.3 key must never change');
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

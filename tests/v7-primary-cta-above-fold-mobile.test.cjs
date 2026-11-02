'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Reconcile sibling PR #97 CTA checks with PR #96 decorative field landmarks.
// This test is isolated to the V7 prototype; it must not write the V6.3 key.
const URL = 'http://127.0.0.1:8765/v7/multiplayer.html';
const LEGACY_KEY = 'warriors-hit-lab-v4';

test('UI-001: 375/390px primary CTAs and field landmarks work together without changing legacy saves', async () => {
  const browser = await chromium.launch();
  try {
    for (const [width, height] of [[375, 812], [390, 844]]) {
      const context = await browser.newContext({
        viewport: { width, height }, isMobile: true, hasTouch: true,
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      try {
        await page.goto(URL);
        await page.evaluate(key => localStorage.setItem(key, 'v6.3-preserve-me'), LEGACY_KEY);

        const assertAboveFold = async selector => {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          const box = await page.locator(selector).boundingBox();
          assert.ok(box && box.height >= 44, selector + ' >=44px touch target at ' + width);
          assert.ok(box.y >= 0 && box.y + box.height <= height - 60,
            selector + ' above bottom nav at ' + width + ': ' + JSON.stringify(box));
          const accessible = await page.locator(selector).evaluate(el => {
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return hit === el || el.contains(hit);
          });
          assert.equal(accessible, true, selector + ' not covered by another control');
        };

        await assertAboveFold('#start');
        await page.locator('#start').tap();
        await assertAboveFold('#turn');
        await page.locator('#turn').tap();
        await assertAboveFold('#record');

        assert.equal(await page.locator('.practice-card #record').count(), 1);
        assert.equal(await page.locator('.practice-card #zones button').count(), 9);
        assert.equal(await page.locator('.simulation-module').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
          'no horizontal overflow at ' + width);

        const field = page.locator('.simulated-field');
        assert.equal(await field.locator('.field-base').count(), 3);
        assert.equal(await field.locator('.field-home-plate').count(), 1);
        const pointerEvents = await field.locator('.field-base,.field-home-plate')
          .evaluateAll(nodes => nodes.map(node => getComputedStyle(node).pointerEvents));
        assert.ok(pointerEvents.every(value => value === 'none'), 'decorative landmarks cannot intercept taps');

        await page.locator('#zones button').nth(4).tap();
        assert.equal(await page.locator('#record').isEnabled(), true);
        await page.locator('#outcome').selectOption('single');
        await page.locator('#record').tap();
        assert.equal(await page.locator('.score-diamond i.occupied').count(), 1,
          'scoreboard runner indicator reflects a recorded single');
        assert.equal(await page.evaluate(key => localStorage.getItem(key), LEGACY_KEY), 'v6.3-preserve-me');

        const saved = await page.evaluate(
          () => localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
        await page.reload();
        assert.equal(await field.locator('.field-home-plate').count(), 1);
        assert.equal(await page.evaluate(
          () => localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')), saved);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), LEGACY_KEY), 'v6.3-preserve-me');
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
});

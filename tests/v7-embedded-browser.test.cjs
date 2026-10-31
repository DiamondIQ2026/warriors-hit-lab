'use strict';
// Browser test against only the local PR branch; disposable profile, synthetic saves.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/';
const KEY='warriors-hit-lab-v4';
test('embedded preview opens, skips, and preserves scored swing on reload',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL);
  await page.locator('#playerName').fill('Synthetic Player');
  await page.locator('#myTeam').fill('Tampa Warriors');
  await page.locator('#hand').selectOption('R');
  await page.locator('#saveProfile').click();
  await page.locator('#gameMode').selectOption('quick');
  await page.locator('#start').click();
  await page.locator('[data-zone="MC"]').first().evaluate(e=>e.click());
  await page.locator('[data-power="hard"]').first().evaluate(e=>e.click());
  const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(before.stats.swings,1);
  const link=page.locator('a[data-v7-flight]');
  assert.equal(await link.count(),1);
  await link.evaluate(e=>e.click());
  const panel=page.locator('#v7FlightPanel');
  assert.equal(await panel.evaluate(e=>e.classList.contains('hidden')),false);
  const frame=page.frameLocator('#v7FlightFrame');
  await frame.locator('#play').click();
  await frame.locator('#skip').click();
  await frame.locator('#result').waitFor({state:'visible'});
  assert.match(await frame.locator('#result').innerText(),/complete/);
  await page.locator('#v7FlightClose').click();
  assert.equal(await panel.evaluate(e=>e.classList.contains('hidden')),true);
  assert.equal(await page.locator('#v7FlightFrame').getAttribute('src'),null);
  const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.deepEqual(after,before);
  await page.reload();
  const reloaded=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(reloaded.stats.swings,1);
  assert.deepEqual(errors.filter(message=>!message.includes("Service worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag")),[], 'No unexpected game or preview runtime errors');
 }finally{await context.close();await browser.close()}
});

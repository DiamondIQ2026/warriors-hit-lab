'use strict';
// Focused gameplay safety checks: undo and reload in a disposable Chromium profile.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/', KEY='warriors-hit-lab-v4';
async function fresh(browser){
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 await page.goto(URL,{waitUntil:'domcontentloaded'});
 await page.locator('#playerName').fill('Synthetic Tester');
 await page.locator('#myTeam').fill('Tampa Warriors');
 await page.locator('#hand').selectOption('R');
 await page.locator('#saveProfile').click();
 const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 return {page,context,errors,state};
}
test('Undo restores all tracked game and contact statistics',async()=>{
 const browser=await chromium.launch();
 try{
  const t=await fresh(browser);
  await t.page.locator('#gameMode').selectOption('quick');
  await t.page.locator('#start').click();
  const before=await t.state();
  await t.page.locator('[data-zone="MC"]').first().evaluate(e=>e.click());
  await t.page.locator('[data-power="hard"]').first().evaluate(e=>e.click());
  const after=await t.state();
  assert.equal(after.stats.swings,before.stats.swings+1);
  assert.equal(after.zones.MC,before.zones.MC+1);
  await t.page.locator('#undoSwing').evaluate(e=>e.click());
  const undone=await t.state();
  assert.deepEqual(undone.game,before.game);
  assert.deepEqual(undone.stats,before.stats);
  assert.deepEqual(undone.zones,before.zones);
  assert.deepEqual(undone.practice,before.practice);
  assert.equal(undone.xp,before.xp);
  assert.deepEqual(t.errors,[]);
  await t.context.close();
 }finally{await browser.close()}
});
test('Edit player name and batting hand persists over reload',async()=>{
 const browser=await chromium.launch();
 try{
  const t=await fresh(browser);
  await t.page.locator('#editProfile').evaluate(e=>e.click());
  await t.page.locator('#playerName').fill('Another Synthetic Player');
  await t.page.locator('#hand').selectOption('L');
  await t.page.locator('#saveProfile').click();
  await t.page.reload({waitUntil:'domcontentloaded'});
  const d=await t.state();
  assert.equal(d.player.name,'Another Synthetic Player');
  assert.equal(d.player.hand,'L');
  assert.deepEqual(t.errors,[]);
  await t.context.close();
 }finally{await browser.close()}
});

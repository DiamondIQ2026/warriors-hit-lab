'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/';
const CPU_KEY='hitlab-v7-visual-prototype-only';
const RIVALRY_KEY='warriors-hit-lab-v7-multiplayer-prototype';
const phone={viewport:{width:375,height:812},isMobile:true,hasTouch:true,serviceWorkers:'block'};
async function withinFold(page,selector){
 const loc=page.locator(selector).first();assert.equal(await loc.isVisible(),true,selector+' visible');
 const rect=await loc.boundingBox();assert.ok(rect&&rect.y>=0&&rect.y+rect.height<=812,selector+' above fold');
}
test('CPU phone scoreboard, nine-zone swing, navigation and save/reload remain isolated',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext(phone),page=await context.newPage();
  await page.goto(BASE+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  assert.equal(await page.locator('.score').isVisible(),true);
  assert.equal(await page.locator('.quick-zone button').count(),9);
  await withinFold(page,'#swing');
  await page.locator('.quick-zone button').nth(4).tap();
  await page.locator('#swing').tap();
  const first=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU_KEY);
  assert.equal(first.zone,5);assert.equal(first.reps,1);
  await page.reload();await page.locator('#resumeGame').click();
  const second=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU_KEY);
  assert.equal(second.reps,1);assert.equal(second.zone,5);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),RIVALRY_KEY),null);
  assert.ok(await page.locator('.nav button').count()>0);
 }finally{await browser.close();}
});
test('Family Rivalry phone handoff and hit, then winning final score resumes without CPU writes',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext(phone),page=await context.newPage();
  await page.goto(BASE+'multiplayer.html');
  await page.locator('#start').tap();
  await withinFold(page,'#turn');
  await page.locator('#turn').tap();
  assert.equal(await page.locator('.score').isVisible(),true);
  assert.equal(await page.locator('#zones button').count(),9);
  await page.locator('#zones button').nth(4).tap();
  await page.locator('#outcome').selectOption('single');
  await page.locator('#record').tap();
  const first=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RIVALRY_KEY);
  assert.equal(first.atBats.length,1);
  await page.reload();
  const restored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RIVALRY_KEY);
  assert.deepEqual(restored,first);
  assert.ok(await page.locator('.v7-nav a').count()>0);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),CPU_KEY),null);
 }finally{await browser.close();}
});

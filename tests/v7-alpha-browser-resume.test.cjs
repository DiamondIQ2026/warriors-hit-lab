'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ORIGIN='http://127.0.0.1:8765';
const CPU='hitlab-v7-visual-prototype-only';
const RIVALRY='warriors-hit-lab-v7-multiplayer-prototype';
async function saved(page,key){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)}
test('CPU started match survives reload and continues with stable inning scores and outs',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(ORIGIN+'/v7/experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  const initial=await saved(page,CPU);
  assert.equal(initial.gameStarted,true);
  assert.equal(initial.inning,1);
  await page.reload();
  await page.locator('#resumeGame').first().click();
  const resumed=await saved(page,CPU);
  for(const key of ['inning','outs','away','home','mode'])assert.deepEqual(resumed[key],initial[key],key);
  await page.locator('#swing').click();
  await page.waitForTimeout(1150);
  const after=await saved(page,CPU);
  assert.equal(after.reps,initial.reps+1);
  assert.equal(after.gameStarted,true);
  assert.equal(await saved(page,RIVALRY),null);
  await context.close();
 }finally{await browser.close()}
});
test('Family Rivalry restores score, inning, outs and both batting orders after reload',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(ORIGIN+'/v7/multiplayer.html');
  await page.locator('#start').click();
  await page.locator('#turn').click();
  await page.locator('#zones button').first().click();
  await page.locator('#outcome').selectOption('homer');
  await page.locator('#record').click();
  const initial=await saved(page,RIVALRY);
  assert.equal(initial.score.maddon,1);
  await page.reload();
  const resumed=await saved(page,RIVALRY);
  for(const key of ['inning','half','outs','score','battingOrder'])assert.deepEqual(resumed[key],initial[key],key);
  await page.locator('#turn').click();
  await page.locator('#zones button').first().click();
  await page.locator('#outcome').selectOption('out');
  await page.locator('#record').click();
  const after=await saved(page,RIVALRY);
  assert.equal(after.atBats.length,initial.atBats.length+1);
  assert.equal(after.score.maddon,1);
  assert.equal(await saved(page,CPU),null);
  await context.close();
 }finally{await browser.close()}
});

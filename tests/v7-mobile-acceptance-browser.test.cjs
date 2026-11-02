'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:8765/v7/';
const CPU='hitlab-v7-visual-prototype-only',RIVALRY='warriors-hit-lab-v7-multiplayer-prototype';
async function phone(browser){return browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});}
async function above(page,selector){
 const el=page.locator(selector).first();assert.equal(await el.isVisible(),true,selector+' visible');
 const b=await el.boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=812,selector+' above fold');
}
test('375px CPU mobile zone grid, touch selection, primary CTA, swing and resume',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await phone(browser),page=await context.newPage();
  await page.goto(ROOT+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  assert.equal(await page.locator('[data-zone]').count(),9);
  await above(page,'#swing');
  await page.locator('[data-zone="5"]').tap();
  await page.locator('#swing').tap();
  const first=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  assert.equal(first.zone,5);assert.equal(first.reps,1);
  await page.reload();
  await page.locator('#resumeGame').click();
  const later=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  assert.equal(later.reps,1);assert.equal(later.zone,5);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),RIVALRY),null);
  await context.close();
 }finally{await browser.close();}
});
test('375px Family Rivalry handoff, nine zones, swing, resume, and final game',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await phone(browser),page=await context.newPage();
  await page.goto(ROOT+'multiplayer.html');
  await page.locator('#start').tap();
  await above(page,'#turn');
  await page.locator('#turn').tap();
  assert.equal(await page.locator('#zones button').count(),9);
  await page.locator('#zones button').nth(4).tap();
  assert.equal(await page.locator('#zones button').nth(4).getAttribute('aria-pressed'),'true');
  await page.locator('#outcome').selectOption('homer');
  await page.locator('#record').tap();
  const first=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RIVALRY);
  assert.equal(first.atBats.length,1);assert.equal(first.score.maddon,1);
  await page.reload();
  const restored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RIVALRY);
  assert.deepEqual(restored,first);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),CPU),null);
  await context.close();
 }finally{await browser.close();}
});

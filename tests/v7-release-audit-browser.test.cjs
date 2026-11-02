'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ORIGIN='http://127.0.0.1:8765/v7/';
const CPU='hitlab-v7-visual-prototype-only';
const RIVALRY='warriors-hit-lab-v7-multiplayer-prototype';
test('mobile screen readers can identify the game scoreboard, nine batting zones and persistent navigation',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  await page.goto(ORIGIN+'multiplayer.html');
  await page.locator('#start').tap();
  assert.equal(await page.locator('.score').getAttribute('aria-label'),'Game scoreboard');
  assert.ok((await page.locator('.v7-nav a').count())>0);
  assert.equal(await page.locator('#turn').isVisible(),true);
  await page.locator('#turn').tap();
  const zones=page.locator('#zones button');
  assert.equal(await zones.count(),9);
  for(let i=0;i<9;i++){
   assert.match(await zones.nth(i).getAttribute('aria-label'),new RegExp('Net impact zone '+(i+1)+' of 9'));
  }
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),CPU),null);
 }finally{await browser.close();}
});
test('CPU accessible zones and game resume never create Family Rivalry save',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(ORIGIN+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  assert.equal(await page.locator('.quick-zone button').count(),9);
  const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  await page.reload();
  await page.locator('#resumeGame').first().click();
  const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  for(const key of ['inning','outs','home','away','mode'])assert.deepEqual(after[key],before[key]);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),RIVALRY),null);
 }finally{await browser.close();}
});
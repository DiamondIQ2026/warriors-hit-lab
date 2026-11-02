'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:8765/v7/';
const CPU='hitlab-v7-visual-prototype-only',RIVALRY='warriors-hit-lab-v7-multiplayer-prototype';
const phone={viewport:{width:375,height:812},isMobile:true,hasTouch:true};
test('Family Rivalry mobile final third out, navigation, and final-score reload',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(phone);
  await page.goto(ROOT+'multiplayer.html');
  await page.locator('#start').tap();
  await page.evaluate(key=>{
   const m=JSON.parse(localStorage.getItem(key));
   m.inning=3;m.half='top';m.outs=2;
   m.score[m.home.id]=5;m.score[m.away.id]=1;
   localStorage.setItem(key,JSON.stringify(m));
  },RIVALRY);
  await page.reload();
  if(await page.locator('#turn').isVisible())await page.locator('#turn').tap();
  const zones=page.locator('#zones button');
  assert.equal(await zones.count(),9);
  await zones.nth(4).tap();
  await page.locator('#outcome').selectOption('out');
  await page.locator('#record').tap();
  const result=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),RIVALRY);
  assert.equal(result.status,'final');
  assert.equal(result.winner,result.home.id);
  await page.reload();
  const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),RIVALRY);
  assert.deepEqual(restored,result);
  assert.ok(await page.locator('.v7-nav a').count()>0);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),CPU),null);
 }finally{await browser.close();}
});
test('CPU mobile keyboard batting and accessible scoreboard survive reload without rivalry writes',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(ROOT+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  assert.equal(await page.locator('.score').isVisible(),true);
  const zones=page.locator('.quick-zone button');
  assert.equal(await zones.count(),9);
  await zones.nth(4).focus();
  await page.keyboard.press('Enter');
  assert.equal(await zones.nth(4).getAttribute('aria-pressed'),'true');
  const button=page.locator('#swing'),box=await button.boundingBox();
  assert.ok(box&&box.y>=0&&box.y+box.height<=812);
  await button.click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  assert.equal(saved.reps,1);
  await page.reload();
  await page.locator('#resumeGame').click();
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU)).reps,1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),RIVALRY),null);
 }finally{await browser.close();}
});

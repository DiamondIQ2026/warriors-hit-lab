'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/v7/';
const RIVALRY='warriors-hit-lab-v7-multiplayer-prototype',CPU='hitlab-v7-visual-prototype-only';
test('V7 version-one Family Rivalry fixture preserves lineup, inning, runner and scoring details',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(URL+'multiplayer.html');
  await page.locator('#start').click();
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.inning=2;s.half='bottom';s.outs=1;s.bases=[true,false,true];
   s.score[s.away.id]=4;s.score[s.home.id]=3;
   s.battingOrder[s.home.id]=5;s.battingOrder[s.away.id]=7;
   localStorage.setItem(key,JSON.stringify(s));
  },RIVALRY);
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),RIVALRY);
  await page.reload();
  const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),RIVALRY);
  assert.deepEqual(restored,original);
  assert.equal(restored.inning,2);
  assert.deepEqual(restored.bases,[true,false,true]);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),CPU),null);
 }finally{await browser.close();}
});
test('mobile nav and scoreboard remain exposed with existing V7 CPU snapshot',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(URL+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CPU);
  await page.reload();
  await page.locator('#resumeGame').click();
  assert.equal(await page.locator('.score').isVisible(),true);
  assert.equal(await page.locator('.quick-zone button').count(),9);
  assert.ok(await page.locator('.nav button').count()>0);
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CPU);
  for(const k of ['inning','outs','home','away','mode'])assert.deepEqual(after[k],before[k]);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),RIVALRY),null);
 }finally{await browser.close();}
});
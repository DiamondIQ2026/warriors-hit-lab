'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:8765/v7/';
const CPU='hitlab-v7-visual-prototype-only',RIVALRY='warriors-hit-lab-v7-multiplayer-prototype';
test('existing V7 Family Rivalry version-one save restores without migration or CPU writes',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  await page.goto(ROOT+'multiplayer.html');
  await page.locator('#start').tap();
  const snapshot=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RIVALRY);
  assert.equal(snapshot.version,1);
  await page.evaluate(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:RIVALRY,save:snapshot});
  await page.reload();
  const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RIVALRY);
  assert.deepEqual(after,snapshot);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),CPU),null);
 }finally{await browser.close();}
});
test('existing V7 CPU game snapshot resumes with unchanged score and isolated storage',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(ROOT+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  const snapshot=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  await page.evaluate(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:CPU,save:snapshot});
  await page.reload();
  await page.locator('#resumeGame').first().click();
  const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  for(const key of ['mode','inning','outs','home','away','innings'])assert.deepEqual(after[key],snapshot[key]);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),RIVALRY),null);
 }finally{await browser.close();}
});
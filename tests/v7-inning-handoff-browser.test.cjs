'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/';
test('Family Rivalry three outs clear runners and switch to bottom half without touching CPU save',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(BASE+'multiplayer.html');
  await page.locator('#start').click();
  await page.locator('#turn').click();
  for(let i=0;i<3;i++){
   await page.locator('#zones button').first().click();
   await page.locator('#outcome').selectOption('out');
   await page.locator('#record').click();
  }
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.equal(s.half,'bottom');assert.equal(s.outs,0);assert.deepEqual(s.bases,[false,false,false]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});
test('CPU browser loads shared third-out rule, keeps its own save key',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(BASE+'experimental/visual-prototype.html');
  assert.deepEqual(await page.evaluate(()=>window.HitLabBaseRules.afterThirdOut()),{outs:0,bases:[false,false,false]});
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  assert.notEqual(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),null);
 }finally{await browser.close();}
});
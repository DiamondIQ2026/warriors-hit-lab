'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/v7/';
test('shared base rules drive CPU gameplay without writing Family Rivalry save',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(URL+'experimental/visual-prototype.html');
  assert.deepEqual(await page.evaluate(()=>window.HitLabBaseRules.advance([true,false,true],2)),{bases:[false,true,true],runs:1});
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  await page.locator('#swing').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),null);
 }finally{await browser.close();}
});
test('Family Rivalry homer retains shared four-run base rule and isolated save',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(URL+'multiplayer.html');
  assert.equal(await page.evaluate(()=>window.HitLabBaseRules.advance([true,true,true],4).runs),4);
  await page.locator('#start').click();
  await page.locator('#turn').click();
  await page.locator('#zones button').first().click();
  await page.locator('#outcome').selectOption('homer');
  await page.locator('#record').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.equal(saved.score.maddon,1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});
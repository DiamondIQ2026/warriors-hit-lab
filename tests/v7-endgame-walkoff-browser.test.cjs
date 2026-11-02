'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {matchFixture}=require('./helpers/v7-match-fixtures.cjs');
const ROOT='http://127.0.0.1:8765/v7/';
test('actual Family Rivalry browser UI completes a walkoff and resumes final-state save',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(ROOT+'multiplayer.html');
  await page.locator('#start').click();
  await page.evaluate(m=>localStorage.setItem('warriors-hit-lab-v7-multiplayer-prototype',JSON.stringify(m)),
   matchFixture('tied-bottom3-one-out'));
  await page.reload();
  if(await page.locator('#turn').isVisible())await page.locator('#turn').click();
  await page.locator('#zones button').nth(4).click();
  await page.locator('#outcome').selectOption('homer');
  await page.locator('#record').click();
  const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.equal(first.status,'final');assert.equal(first.winner,'dad');
  await page.reload();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.deepEqual(restored,first);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});

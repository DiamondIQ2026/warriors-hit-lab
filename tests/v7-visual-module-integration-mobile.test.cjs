'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('V7 mobile clearly separates real swing input from simulated field output',async()=>{
 const browser=await chromium.launch();
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();
  assert.equal(await page.locator('.practice-card #record').count(),1);
  assert.equal(await page.locator('.practice-card #zones button').count(),9);
  assert.equal(await page.locator('.simulation-module .simulated-field').count(),1);
  assert.match(await page.locator('.simulation-module-title').textContent(),/NOT REAL STATS/);
  await page.locator('#turn').tap();
  await page.locator('#zones button').nth(4).tap();
  await page.locator('#outcome').selectOption('single');
  await page.locator('#record').tap();
  assert.equal(await page.locator('.simulation-module .simulated-field').getAttribute('data-outcome'),'single');
  const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
  await page.reload();
  assert.equal(await page.locator('.simulation-module .simulated-field').getAttribute('data-outcome'),'single');
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
  await page.close();
 }
 }finally{await browser.close();}
});
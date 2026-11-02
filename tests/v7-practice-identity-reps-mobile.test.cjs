'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('practice panel displays actual current hand and recorded swing count without simulated stats',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   const hand=page.locator('#practiceBatterHand'),reps=page.locator('#practiceRealSwingCount');
   assert.match(await hand.textContent(),/(LEFT|RIGHT)-HANDED/);
   assert.equal(await reps.textContent(),'Recorded swings: 0');
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('single');
   await page.locator('#record').tap();
   assert.equal(await reps.textContent(),'Recorded swings: 1');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await reps.textContent(),'Recorded swings: 1');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   assert.equal(await page.locator('.practice-live-status #outcome').count(),0);
   await page.close();
  }
 }finally{await browser.close();}
});
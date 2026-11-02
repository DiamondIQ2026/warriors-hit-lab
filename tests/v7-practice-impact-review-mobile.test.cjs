'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('real practice gives accessible live impact review separate from simulated outcome on two phone sizes',async()=>{
 const browser=await chromium.launch();
 try {
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   const review=page.locator('#practiceImpactReview');
   assert.match(await review.textContent(),/Select a net-impact zone/);
   assert.equal(await review.getAttribute('data-ready'),'false');
   await page.locator('#zones button').nth(4).tap();
   assert.match(await review.textContent(),/Selected net zone 5 of 9/);
   assert.equal(await review.getAttribute('data-ready'),'true');
   await page.locator('#power').selectOption('soft');
   assert.match(await review.textContent(),/soft contact/);
   await page.locator('#outcome').selectOption('double');
   assert.doesNotMatch(await review.textContent(),/double/);
   await page.locator('#record').tap();
   assert.match(await review.textContent(),/Select a net-impact zone/);
   assert.equal(await review.getAttribute('data-ready'),'false');
   assert.match(await page.locator('#practiceRealSwingCount').textContent(),/1/);
   assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
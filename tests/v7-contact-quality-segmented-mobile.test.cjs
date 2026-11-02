'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile hard medium soft contact controls preserve existing gameplay input and saves',async()=>{
 const browser=await chromium.launch();
 try {
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   const opts=page.locator('.contact-quality-options button');
   assert.equal(await opts.count(),3);
   assert.equal(await opts.nth(0).getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#power').inputValue(),'hard');
   await opts.nth(2).tap();
   assert.equal(await page.locator('#power').inputValue(),'soft');
   assert.equal(await opts.nth(2).getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#practiceImpactReview').textContent(),/Select a net-impact zone/);
   await page.locator('#zones button').nth(4).tap();
   assert.match(await page.locator('#practiceImpactReview').textContent(),/soft contact/);
   await page.locator('#outcome').selectOption('single');
   await page.locator('#record').tap();
   assert.match(await page.locator('#event').textContent(),/soft/);
   assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'single');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
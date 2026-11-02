'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('real swing feedback uses numbered zones and explicitly labels simulation on both phone sizes',async()=>{
 const browser=await chromium.launch();
 try {
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('.contact-quality-options button[data-contact=soft]').tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#recordAfterChoices').tap();
   const event=await page.locator('#event').textContent();
   assert.match(event,/Real tee swing recorded/);
   assert.match(event,/Net zone 5 of 9/);
   assert.match(event,/soft contact/);
   assert.match(event,/Simulated game result: double/);
   assert.doesNotMatch(event,/Recorded MC/);
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   assert.equal(JSON.parse(saved).atBats.length,1);
   await page.reload();
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile simulated field shows result-specific flight with accessible reduced-motion fallback',async()=>{
 const browser=await chromium.launch();
 try {
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#record').tap();
   const marker=page.locator('.simulated-field .outcome-ball');
   assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
   const animation=await marker.evaluate(el=>({name:getComputedStyle(el).animationName,duration:getComputedStyle(el).animationDuration,offset:getComputedStyle(el).getPropertyValue('--flight-x').trim()}));
   assert.equal(animation.name,'hitlab-field-flight');
   assert.equal(animation.duration,'0.68s');
   assert.equal(animation.offset,'-54px');
   const before=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await marker.evaluate(el=>getComputedStyle(el).animationName),'none');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),before);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
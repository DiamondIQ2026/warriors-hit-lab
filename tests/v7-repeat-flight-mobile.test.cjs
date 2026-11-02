'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('consecutive identical simulated results replay flight and respect reduced motion at mobile widths',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   const swing=async()=>{await page.locator('#zones button').nth(4).tap();await page.locator('#outcome').selectOption('double');await page.locator('#record').tap();};
   await swing();
   const marker=page.locator('.outcome-ball');
   assert.equal(await marker.evaluate(el=>getComputedStyle(el).animationName),'hitlab-field-flight');
   await marker.evaluate(el=>{window.__firstFlightAnimation=el.getAnimations()[0];});
   await page.waitForTimeout(750);
   await swing();
   assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
   const restarted=await marker.evaluate(el=>({different:el.getAnimations()[0]!==window.__firstFlightAnimation,name:getComputedStyle(el).animationName}));
   assert.equal(restarted.different,true,'new identical outcome must restart animation');
   assert.equal(restarted.name,'hitlab-field-flight');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await marker.evaluate(el=>getComputedStyle(el).animationName),'none');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
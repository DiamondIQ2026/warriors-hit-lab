'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile field stage gives animated marker room without obstructing real swing input',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   const stage=page.locator('.simulation-module .simulated-field');
   const rect=await stage.boundingBox();
   assert.ok(rect&&rect.height>=170&&rect.height<=220,JSON.stringify({width,rect}));
   assert.equal(await stage.locator('.field-foul-line').count(),2);
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#record').tap();
   assert.equal(await stage.getAttribute('data-outcome'),'double');
   assert.equal(await stage.locator('.outcome-ball').evaluate(el=>getComputedStyle(el).animationName),'hitlab-field-flight');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await stage.getAttribute('data-outcome'),'double');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
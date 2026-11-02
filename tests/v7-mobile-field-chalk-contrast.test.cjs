'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('field chalk and bases remain visible and noninteractive on 375 and 390px phones',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   const field=page.locator('.simulated-field');
   assert.equal(await field.locator('.field-foul-line').count(),2);
   assert.equal(await field.locator('.field-base').count(),3);
   assert.equal(await field.locator('.field-home-plate').count(),1);
   const geometry=await field.locator('.field-foul-line,.field-base,.field-home-plate').evaluateAll(nodes=>nodes.map(n=>({pointer:getComputedStyle(n).pointerEvents,width:parseFloat(getComputedStyle(n).width),visible:getComputedStyle(n).visibility})));
   assert.ok(geometry.every(x=>x.pointer==='none'&&x.visible==='visible'));
   assert.ok(geometry.slice(0,2).every(x=>x.width>=2.5));
   assert.ok(geometry.slice(2).every(x=>x.width>=10));
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#record').tap();
   assert.equal(await field.getAttribute('data-outcome'),'double');
   assert.equal(await page.locator('.score-diamond i.occupied').count(),1);
   const before=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),before);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
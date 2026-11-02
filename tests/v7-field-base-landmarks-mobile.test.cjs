'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('field base and plate markings are noninteractive and do not alter runner state on phones',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   const field=page.locator('.simulated-field');
   assert.equal(await field.locator('.field-base').count(),3);
   assert.equal(await field.locator('.field-home-plate').count(),1);
   const markers=await field.locator('.field-base,.field-home-plate').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).pointerEvents));
   assert.ok(markers.every(v=>v==='none'));
   assert.equal(await page.locator('.score-diamond i.occupied').count(),0);
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('single');
   await page.locator('#record').tap();
   assert.equal(await page.locator('.score-diamond i.occupied').count(),1);
   assert.equal(await field.locator('.field-base').count(),3);
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await field.locator('.field-home-plate').count(),1);
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('field foul-line geometry stays decorative and simulated outcomes persist on mobile',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   const field=page.locator('.simulated-field');
   assert.equal(await field.locator('.field-foul-line').count(),2);
   const geometry=await field.locator('.field-foul-line').evaluateAll(nodes=>nodes.map(el=>({height:el.getBoundingClientRect().height,pointer:getComputedStyle(el).pointerEvents})));
   assert.ok(geometry.every(g=>g.height>25&&g.pointer==='none'));
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#record').tap();
   assert.equal(await field.getAttribute('data-outcome'),'double');
   assert.equal(await field.locator('.field-foul-line').count(),2);
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await field.getAttribute('data-outcome'),'double');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
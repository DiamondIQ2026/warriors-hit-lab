'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile practice result shortcut appears only after recorded swing and survives reload',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   assert.equal(await page.locator('#seeLastSwing').isVisible(),false);
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#recordAfterChoices').tap();
   const shortcut=page.locator('#seeLastSwing');
   assert.equal(await shortcut.isVisible(),true);
   await shortcut.tap();
   assert.match(await page.locator('#event').textContent(),/Net zone 5 of 9/);
   const inView=await page.locator('#event').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.top<innerHeight;});
   assert.equal(inView,true);
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await shortcut.isVisible(),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
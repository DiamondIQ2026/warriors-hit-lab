'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile scoreboard base indicators remain legible and consistent with game state',async()=>{
 const browser=await chromium.launch();
 try {
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   const diamond=page.locator('.score-diamond');
   const bounds=await diamond.boundingBox();
   assert.ok(bounds&&bounds.width>=25&&bounds.height>=25,'base indicator must be readable on '+width);
   assert.equal(await diamond.getAttribute('aria-label'),'Bases occupied: none');
   assert.equal(await page.locator('.v7-nav').count(),1);
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('single');
   await page.locator('#record').tap();
   assert.equal(await diamond.locator('i.occupied').count(),1);
   assert.equal(await diamond.getAttribute('aria-label'),'Bases occupied: 1');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await diamond.locator('i.occupied').count(),1);
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
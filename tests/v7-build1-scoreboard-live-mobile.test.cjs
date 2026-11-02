'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('Build 1 scoreboard mirrors recorded scoring and base occupancy at both mobile widths',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   const away=page.locator('#awayScore'),home=page.locator('#homeScore');
   assert.equal(await away.locator('.score-team').innerText(),'Tampa Warriors');
   assert.equal(await away.locator('.score-points').innerText(),'0');
   assert.equal(await home.locator('.score-team').innerText(),'Tampa Titans');
   assert.equal(await home.locator('.score-points').innerText(),'0');
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('single');
   await page.locator('#recordAfterChoices').tap();
   assert.match(await page.locator('.score-diamond').getAttribute('aria-label'),/1/);
   assert.equal(await page.locator('.score-diamond [data-base="1"]').evaluate(e=>e.classList.contains('occupied')),true);
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('homer');
   await page.locator('#recordAfterChoices').tap();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
   assert.equal(saved.score[saved.away.id],2);
   assert.equal(await away.locator('.score-team').innerText(),'Tampa Warriors');
   assert.equal(await away.locator('.score-points').innerText(),'2');
   assert.equal(await home.locator('.score-team').innerText(),'Tampa Titans');
   assert.equal(await home.locator('.score-points').innerText(),'0');
   assert.match(await page.locator('.score-diamond').getAttribute('aria-label'),/none/);
   const scoreRect=await page.locator('.score').boundingBox();
   assert.ok(scoreRect&&scoreRect.width<=width&&scoreRect.height<150,'scoreboard fits phone width');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const snapshot=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await away.locator('.score-team').innerText(),'Tampa Warriors');
   assert.equal(await away.locator('.score-points').innerText(),'2');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),snapshot);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('both team names and scores use symmetric mobile scorebug slots without changing saved gameplay',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   for(const id of ['awayScore','homeScore']){
    assert.equal(await page.locator('#'+id+' .score-team').count(),1);
    assert.equal(await page.locator('#'+id+' .score-points').count(),1);
    assert.equal(await page.locator('#'+id+' .score-points').textContent(),'0');
    const layout=await page.locator('#'+id).evaluate(el=>({direction:getComputedStyle(el).flexDirection,fontSize:parseFloat(getComputedStyle(el.querySelector('.score-points')).fontSize)}));
    assert.equal(layout.direction,'column');assert.ok(layout.fontSize>=20);
   }
   assert.equal(await page.locator('#awayScore .score-team').textContent(),'Tampa Warriors');
   assert.equal(await page.locator('#homeScore .score-team').textContent(),'Tampa Titans');
   assert.equal(await page.locator('.score-diamond i').count(),3);
   assert.equal(await page.locator('.v7-nav > a,.v7-nav > .nav-disabled').count(),6);
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#record').tap();
   assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await page.locator('#awayScore .score-team').textContent(),'Tampa Warriors');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
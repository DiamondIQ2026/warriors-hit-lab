'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('Build 1 milestone: setup, multiple real swings, turn handoff, saved replay and isolation',async()=>{
 const browser=await chromium.launch();
 try {
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   for(let n=0;n<3;n++){
    await page.locator('#zones button').nth(4).tap();
    await page.locator('.contact-quality-options button[data-contact=medium]').tap();
    await page.locator('#outcome').selectOption('out');
    await page.locator('#record').tap();
    let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
    assert.equal(state.atBats.length,n+1);
    assert.equal(state.realSwings[state.away.id],n+1);
    if(n<2)assert.equal(await page.locator('#record').isDisabled(),true);
   }
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
   assert.equal(state.outs,0,'three outs reset on half-inning transition');
   assert.equal(state.half,'bottom','home bats after visiting third out');
   assert.equal(await page.locator('#swingPanel').isVisible(),false,'pass-phone gate blocks next player');
   const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await page.locator('#swingPanel').isVisible(),false);
   await page.locator('#turn').tap();
   assert.equal(await page.locator('#swingPanel').isVisible(),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

test('Build 1: full two-sided inning credits only real swings and restores game state on both phone widths',async()=>{
 const browser=await chromium.launch();
 try {
 for(const [width,height] of [[375,812],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();
  const storage=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  let start=await storage();
  assert.equal(start.atBats.length,0);
  await page.locator('#turn').tap();
  for(let half=0;half<2;half++){
   const player=half===0?start.away.id:start.home.id;
   for(let out=0;out<3;out++){
    await page.locator('#zones button').nth(out+3).tap();
    await page.locator('.contact-quality-options button[data-contact=medium]').tap();
    await page.locator('#outcome').selectOption('out');
    await page.locator('#recordAfterChoices').tap();
    const state=await storage();
    assert.equal(state.atBats.length,half*3+out+1);
    assert.equal(state.realSwings[player],out+1);
    assert.equal(state.realSwings[half===0?start.home.id:start.away.id],half===0?0:3);
    assert.equal(state.score[state.home.id],0);
    assert.equal(state.score[state.away.id],0);
   }
   let transition=await storage();
   assert.equal(transition.outs,0);
   assert.equal(transition.half,half===0?'bottom':'top');
   assert.equal(transition.inning,half===0?1:2);
   assert.equal(await page.locator('#swingPanel').isVisible(),false);
   const snapshot=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   await page.reload();
   assert.equal(await page.locator('#swingPanel').isVisible(),false);
   await page.locator('#turn').tap();
   assert.equal(await page.locator('#swingPanel').isVisible(),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),snapshot);
  }
  const final=await storage();
  assert.equal(final.atBats.length,6);
  assert.equal(final.realSwings[start.away.id],3);
  assert.equal(final.realSwings[start.home.id],3);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
  await page.close();
 }
 }finally{await browser.close();}
});
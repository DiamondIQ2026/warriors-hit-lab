'use strict';
// Independent QA only: deterministic loopback outcome overrides, isolated browser contexts.
// Covers a home walkoff on the first bottom-of-final-inning swing for 3/6/9 innings.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';

for(const [browserType,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const innings of [3,6,9]){
  test(`bottom-final walkoff, real tee reps, pass-phone and resume: ${innings} innings ${label}`,async()=>{
   const browser=await browserType.launch();
   try{
    const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.evaluate(()=>{
      localStorage.setItem('hitlab-v63-career-sentinel','KEEP_V63');
      localStorage.setItem('unrelated-qa-sentinel','KEEP_OTHER');
     });
     await page.locator('#innings').selectOption(String(innings));
     await page.locator('#start').tap();
     const outsBeforeBottomFinal=6*innings-3;
     let handoffs=0;
     for(let i=0;i<outsBeforeBottomFinal;i++){
      if(!await page.locator('#swingPanel').isVisible()){
       await page.locator('#turn').tap();handoffs++;
      }
      await page.locator('#zones button').nth(4).tap();
      await page.locator('#outcome').selectOption('out');
      await page.locator('#record').tap();
      if(i===Math.floor(outsBeforeBottomFinal/2)){
       const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
       await page.reload();
       assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'midgame save bytes');
      }
     }
     let state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(state.status,'active');
     assert.equal(state.inning,innings);
     assert.equal(state.half,'bottom');
     assert.equal(state.outs,0);
     assert.equal(state.score.dad,0);
     assert.equal(state.score.maddon,0);
     if(!await page.locator('#swingPanel').isVisible()){
      await page.locator('#turn').tap();handoffs++;
     }
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('homer');
     await page.locator('#record').tap();
     state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(state.status,'final');
     assert.equal(state.winner,'dad');
     assert.equal(state.score.dad,1);
     assert.equal(state.score.maddon,0);
     assert.equal(state.inning,innings);
     assert.equal(state.half,'bottom');
     assert.equal(state.outs,0,'walkoff ends game without a third out');
     assert.equal(state.atBats.length,outsBeforeBottomFinal+1);
     assert.equal(state.realSwings.dad+state.realSwings.maddon,outsBeforeBottomFinal+1);
     assert.ok(handoffs>=innings*2,'both players repeatedly acknowledge phone handoff');
     assert.equal(await page.locator('#postgameRecap').isVisible(),true);
     assert.equal(await page.locator('#turn').isDisabled(),true);
     const finalBytes=await page.evaluate(k=>localStorage.getItem(k),KEY);
     await page.reload();
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),finalBytes,'final save unchanged after reload');
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'KEEP_V63');
     assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),'KEEP_OTHER');
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

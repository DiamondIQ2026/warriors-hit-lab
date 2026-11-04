'use strict';
// Independent QA: repeated CTA activation cannot record a second tee swing,
// and reload must not bypass a new player's phone-handoff acknowledgement.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const [width,height] of [[375,667],[390,844]]){
  test(`${label} ${width}px duplicate Record Swing and reload handoff do not duplicate tee reps`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.locator('#innings').selectOption('3');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('out');
     await page.locator('#record').evaluate(el=>{el.click();el.click();});
     let state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(state.atBats.length,1,'duplicate CTA cannot record a second swing');
     assert.equal(state.realSwings.maddon,1);
     // Finish the top half to require the pass-phone gate for Dad.
     for(let i=0;i<2;i++){
      await page.locator('#zones button').nth(4).tap();
      await page.locator('#record').tap();
     }
     state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(state.half,'bottom');
     assert.equal(state.atBats.length,3);
     const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
     await page.reload();
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'reload is lossless');
     assert.equal(await page.locator('#swingPanel').isVisible(),false,'handoff gate required after reload');
     await page.locator('#record').evaluate(el=>el.click());
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'no unacknowledged swing');
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('out');
     await page.locator('#record').tap();
     state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(state.atBats.length,4);
     assert.equal(state.realSwings.dad,1);
     assert.equal(state.realSwings.maddon,3);
     assert.equal(await page.evaluate(k=>window.HitLabMultiplayer.validateMatch(JSON.parse(localStorage.getItem(k))).ok,KEY),true);
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

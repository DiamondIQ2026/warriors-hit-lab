'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';

// Extends the existing 3-inning end-to-end acceptance with the missing
// 6- and 9-inning paths. QA-only deterministic outcome override runs on localhost.
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const innings of [6,9]){
  test(`full ${innings}-inning Family Rivalry, scoring and safe resume: ${label}`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.evaluate(()=>{localStorage.setItem('hitlab-v63-career-sentinel','KEEP_V63');localStorage.setItem('unrelated-qa-sentinel','KEEP_OTHER')});
     await page.locator('#innings').selectOption(String(innings));
     await page.locator('#start').tap();
     const total=innings*6+1; // one leadoff homer plus three outs per half-inning
     let handoffs=0;
     for(let i=0;i<total;i++){
      assert.equal(await page.locator('#turn').isDisabled(),false,'game should remain active through swing '+i);
      if(!await page.locator('#swingPanel').isVisible()){
       await page.locator('#turn').tap();handoffs++;
      }
      await page.locator('#zones button').nth(4).tap();
      await page.locator('#outcome').selectOption(i===0?'homer':'out');
      await page.locator('#record').tap();
      if(i===Math.floor(total/2)){
       const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
       await page.reload();
       assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'midgame save unchanged');
      }
     }
     const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(saved.status,'final');
     assert.equal(saved.atBats.length,total);
     assert.equal(saved.realSwings.dad+saved.realSwings.maddon,total);
     assert.equal(saved.score.maddon,1);
     assert.equal(saved.score.dad,0);
     assert.ok(handoffs>=innings*2,'pass-phone handoffs cover both teams');
     assert.equal(await page.locator('#postgameRecap').isVisible(),true);
     assert.equal(await page.locator('#turn').isDisabled(),true);
     const finalBytes=await page.evaluate(k=>localStorage.getItem(k),KEY);
     await page.reload();
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),finalBytes);
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'KEEP_V63');
     assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),'KEEP_OTHER');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

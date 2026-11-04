'use strict';
// Reload immediately after recording a swing cannot duplicate or drop a tee rep.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const [width,height] of [[375,667],[390,844]]){
  test(`${label} ${width}px post-record reload preserves one rep and allows exactly one next rep`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.locator('#innings').selectOption('3');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(2).tap();
     await page.locator('#outcome').selectOption('out');
     await page.locator('#record').tap();
     const first=await page.evaluate(k=>localStorage.getItem(k),KEY);
     const one=JSON.parse(first);
     assert.equal(one.atBats.length,1);
     assert.equal(one.realSwings.maddon,1);
     await page.reload();
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),first,'reload cannot rewrite committed save');
     assert.equal(await page.locator('#record').isDisabled(),true,'reload cannot replay last swing');
     await page.locator('#record').evaluate(el=>el.click());
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),first,'disabled record cannot duplicate committed swing');
     await page.locator('#turn').tap();
     assert.equal(await page.locator('#record').isDisabled(),true,'new zone is required');
     await page.locator('#zones button').nth(6).tap();
     await page.locator('#outcome').selectOption('out');
     await page.locator('#record').tap();
     const result=await page.evaluate(k=>{
      const match=JSON.parse(localStorage.getItem(k));
      return {atBats:match.atBats.length,swings:match.realSwings.maddon,validation:window.HitLabMultiplayer.validateMatch(match)};
     },KEY);
     assert.equal(result.atBats,2);
     assert.equal(result.swings,2);
     assert.equal(result.validation.ok,true,JSON.stringify(result.validation));
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

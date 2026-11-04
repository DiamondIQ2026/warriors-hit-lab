'use strict';
// Reload during an unrecorded zone/contact choice must never invent a tee rep.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const [width,height] of [[375,667],[390,844]]){
  test(`${label} ${width}px reload of unrecorded zone choice requires fresh handoff and selection`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.locator('#innings').selectOption('3');
     await page.locator('#start').tap();
     const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(8).tap();
     await page.locator('.contact-quality-options button').last().tap();
     await page.locator('#outcome').selectOption('out');
     assert.equal(await page.locator('#record').isEnabled(),true);
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'pending selection is not persisted');
     await page.reload();
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'reload preserves match bytes');
     assert.equal(await page.locator('#record').isDisabled(),true,'reload requires new handoff/selection');
     await page.locator('#record').evaluate(el=>el.click());
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'disabled Record Swing cannot invent a rep');
     await page.locator('#turn').tap();
     assert.equal(await page.locator('#record').isDisabled(),true,'handoff alone cannot record abandoned zone');
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('out');
     await page.locator('#record').tap();
     const result=await page.evaluate(k=>{
      const match=JSON.parse(localStorage.getItem(k));
      return {atBats:match.atBats.length,swings:match.realSwings.maddon,validation:window.HitLabMultiplayer.validateMatch(match)};
     },KEY);
     assert.equal(result.atBats,1);
     assert.equal(result.swings,1);
     assert.equal(result.validation.ok,true,JSON.stringify(result.validation));
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

'use strict';
// Valid-save reset safety: cancel is lossless; confirm only clears V7 multiplayer.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const [width,height] of [[375,667],[390,844]]){
  test(`${label} ${width}px valid-match reset cancel/confirm preserves legacy and supports new game`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.evaluate(()=>{
      localStorage.setItem('hitlab-v63-career-sentinel','LEGACY_UNCHANGED');
      localStorage.setItem('unrelated-qa-sentinel','OTHER_UNCHANGED');
     });
     await page.locator('#innings').selectOption('3');
     await page.locator('#start').tap();
     const original=await page.evaluate(k=>localStorage.getItem(k),KEY);
     assert.ok(original,'new valid V7 match persisted');
     assert.equal(await page.evaluate(k=>window.HitLabMultiplayer.validateMatch(JSON.parse(localStorage.getItem(k))).ok,KEY),true);
     page.once('dialog',dialog=>dialog.dismiss());
     await page.locator('#reset').evaluate(el=>el.click());
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original,'cancel preserves V7 bytes');
     await page.reload();
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original,'reload preserves cancelled reset');
     page.once('dialog',dialog=>dialog.accept());
     await page.locator('#reset').evaluate(el=>el.click());
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null,'confirmed reset clears only V7');
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'LEGACY_UNCHANGED');
     assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),'OTHER_UNCHANGED');
     await page.locator('#start').tap();
     const fresh=await page.evaluate(k=>localStorage.getItem(k),KEY);
     assert.ok(fresh,'fresh V7 match persisted after reset');
     assert.equal(await page.evaluate(k=>window.HitLabMultiplayer.validateMatch(JSON.parse(localStorage.getItem(k))).ok,KEY),true);
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'LEGACY_UNCHANGED');
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

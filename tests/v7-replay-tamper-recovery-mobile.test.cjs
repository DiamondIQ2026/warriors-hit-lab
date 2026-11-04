'use strict';
// Browser QA: syntactically valid but replay-inconsistent saves must be quarantined.
// No game engine, schema, or production storage modifications.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const corruption of ['forged-score','forged-baserunner','forged-batter']){
  test(`${label} valid-JSON ${corruption} save remains byte-exact and quarantined`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     const original=await page.evaluate(({key,corruption})=>{
      const api=window.HitLabMultiplayer;
      const home=api.createProfile({id:'dad',name:'Dad',team:'Titans'});
      const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors'});
      let match=api.newMatch(home,away,3);
      match=api.recordSwing(match,{zone:'MC',power:'hard',outcome:'single'});
      match=api.recordSwing(match,{zone:'UL',power:'soft',outcome:'out'});
      if(corruption==='forged-score')match.score.maddon=1;
      if(corruption==='forged-baserunner')match.bases=[false,false,true];
      if(corruption==='forged-batter')match.atBats[0].batter='Invented Batter';
      const raw=JSON.stringify(match);
      localStorage.setItem(key,raw);
      localStorage.setItem('hitlab-v63-career-sentinel','V63_UNTOUCHED');
      localStorage.setItem('unrelated-qa-sentinel','OTHER_UNTOUCHED');
      return raw;
     },{key:KEY,corruption});
     await page.reload();
     assert.equal(await page.locator('#saveRecovery').isVisible(),true);
     assert.equal(await page.locator('#start').isDisabled(),true);
     assert.equal(await page.locator('#saveRecoveryExport').isVisible(),true);
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original);
     page.once('dialog',dialog=>dialog.dismiss());
     await page.locator('#saveRecoveryDiscard').tap();
     assert.equal(await page.locator('#saveRecovery').isVisible(),true,'cancelled discard leaves recovery active');
     assert.equal(await page.locator('#start').isDisabled(),true);
     await page.reload();
     assert.equal(await page.locator('#saveRecovery').isVisible(),true,'recovery persists after reload');
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original,'invalid save bytes unchanged');
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'V63_UNTOUCHED');
     assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),'OTHER_UNTOUCHED');
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

'use strict';
// Isolated browser acceptance: confirmed discard removes only invalid V7 save.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const [corruption,width,height] of [['score',375,667],['bases',390,844],['history',375,812]]){
  test(`${label} ${width}px confirmed discard of ${corruption} corruption preserves legacy and permits clean new game`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.evaluate(({key,corruption})=>{
      const api=window.HitLabMultiplayer;
      let m=api.newMatch(api.createProfile({id:'dad',name:'Dad',team:'Titans'}),api.createProfile({id:'maddon',name:'Maddon',team:'Warriors'}),3);
      m=api.recordSwing(m,{zone:'MC',power:'medium',outcome:'single'});
      if(corruption==='score')m.score.maddon=7;
      if(corruption==='bases')m.bases=[false,false,true];
      if(corruption==='history')m.atBats[0].batter='Forged Batter';
      localStorage.setItem(key,JSON.stringify(m));
      localStorage.setItem('hitlab-v63-career-sentinel','LEGACY_SAFE');
      localStorage.setItem('unrelated-qa-sentinel','OTHER_SAFE');
     },{key:KEY,corruption});
     await page.reload();
     assert.equal(await page.locator('#saveRecovery').isVisible(),true);
     assert.equal(await page.locator('#start').isDisabled(),true);
     page.once('dialog',dialog=>dialog.accept());
     await page.locator('#saveRecoveryDiscard').tap();
     assert.equal(await page.locator('#saveRecovery').count(),0);
     assert.equal(await page.locator('#start').isEnabled(),true);
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null);
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'LEGACY_SAFE');
     assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),'OTHER_SAFE');
     await page.locator('#innings').selectOption('3');
     await page.locator('#start').tap();
     const result=await page.evaluate(key=>{
      const raw=localStorage.getItem(key);
      return {present:raw!==null,validation:raw?window.HitLabMultiplayer.validateMatch(JSON.parse(raw)):null,legacy:localStorage.getItem('hitlab-v63-career-sentinel'),other:localStorage.getItem('unrelated-qa-sentinel')};
     },KEY);
     assert.equal(result.present,true,'new match persisted');
     assert.equal(result.validation.ok,true,JSON.stringify(result.validation));
     assert.equal(result.legacy,'LEGACY_SAFE');
     assert.equal(result.other,'OTHER_SAFE');
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

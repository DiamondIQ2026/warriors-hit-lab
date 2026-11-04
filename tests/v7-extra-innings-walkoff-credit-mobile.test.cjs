'use strict';
// Test-only browser engine acceptance: regulation ties and non-HR walkoff credit.
// No writes to production, legacy saves, or gameplay code.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const innings of [3,6,9]){
  for(const scenario of ['tie-extra-inning','bases-loaded-nonhomer-walkoff']){
   test(`${label} ${innings}-inning ${scenario} score and replay integrity`,async()=>{
    const browser=await engine.launch();
    try{
     const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
     try{
      await page.goto(URL);
      const actual=await page.evaluate(({innings,scenario})=>{
       const api=window.HitLabMultiplayer;
       const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
       const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors',hand:'L'});
       let m=api.newMatch(home,away,innings);
       const swing=outcome=>{m=api.recordSwing(m,{zone:'MC',power:'medium',outcome});};
       for(let i=0;i<innings*6;i++)swing('out');
       if(scenario==='tie-extra-inning'){
        const regulation={inning:m.inning,half:m.half,outs:m.outs,status:m.status,score:m.score};
        for(let i=0;i<3;i++)swing('out');
        const extraTop={inning:m.inning,half:m.half,outs:m.outs};
        swing('homer');
        return {regulation,extraTop,final:{inning:m.inning,half:m.half,outs:m.outs,status:m.status,winner:m.winner,score:m.score},validation:api.validateMatch(m)};
       }
       // At bottom of the first extra inning, load bases with three singles.
       for(let i=0;i<3;i++)swing('out');
       for(let i=0;i<3;i++)swing('single');
       const before={inning:m.inning,half:m.half,outs:m.outs,bases:m.bases.slice(),score:{...m.score}};
       swing('double'); // two runners would score, but only winning run is credited.
       return {before,final:{inning:m.inning,half:m.half,outs:m.outs,status:m.status,winner:m.winner,score:m.score,last:m.atBats.at(-1),swings:m.realSwings},validation:api.validateMatch(m)};
      },{innings,scenario});
      assert.equal(actual.validation.ok,true,JSON.stringify(actual.validation));
      if(scenario==='tie-extra-inning'){
       assert.equal(actual.regulation.inning,innings+1);
       assert.equal(actual.regulation.half,'top');
       assert.equal(actual.regulation.status,'active');
       assert.equal(actual.extraTop.half,'bottom');
       assert.equal(actual.final.status,'final');
       assert.equal(actual.final.winner,'dad');
       assert.equal(actual.final.score.dad,1);
       assert.equal(actual.final.score.maddon,0);
      }else{
       assert.equal(actual.before.inning,innings+1);
       assert.equal(actual.before.half,'bottom');
       assert.deepEqual(actual.before.bases,[true,true,true]);
       assert.equal(actual.final.status,'final');
       assert.equal(actual.final.winner,'dad');
       assert.equal(actual.final.score.dad,1);
       assert.equal(actual.final.score.maddon,0);
       assert.equal(actual.final.last.outcome,'double');
       assert.equal(actual.final.last.runs,1,'non-HR walkoff capped at winning run');
       assert.equal(actual.final.swings.dad+actual.final.swings.maddon,innings*6+7);
      }
     }finally{await page.close();}
    }finally{await browser.close();}
   });
  }
 }
}

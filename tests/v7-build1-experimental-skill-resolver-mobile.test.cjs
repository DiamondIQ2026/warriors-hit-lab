'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const GAME_URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': deterministic skill resolver changes with zone, contact and difficulty',async()=>{
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:375,height:667}});
   await page.goto(GAME_URL);
   const result=await page.evaluate(()=>{
    const api=window.HitLabSkillResolver;
    const p1=api.hitProbability('SOFT',1,'All-Star');
    const p2=api.hitProbability('HARD',5,'Rookie');
    return {p1,p2,repeat:api.resolveSwingHit('MEDIUM',5,'Veteran',.5)===api.resolveSwingHit('MEDIUM',5,'Veteran',.5),soft:api.resolveSwingHit('SOFT',1,'All-Star',.5),hard:api.resolveSwingHit('HARD',5,'Rookie',.5)};
   });
   assert.ok(result.p2>result.p1);
   assert.equal(result.repeat,true);
   assert.equal(result.soft,false);
   assert.equal(result.hard,true);
  }finally{await browser.close()}
 });
}

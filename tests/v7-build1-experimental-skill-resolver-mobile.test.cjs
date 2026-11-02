'use strict';
// Independent input-sensitivity assertions: each factor must matter on its own.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const GAME_URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': all 81 contact/zone/difficulty combinations influence deterministic swing outcome',async()=>{
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:375,height:667}});
   await page.goto(GAME_URL);
   const result=await page.evaluate(()=>{
    const api=window.HitLabSkillResolver;
    const contacts=['SOFT','MEDIUM','HARD'],difficulties=['Rookie','Veteran','All-Star'];
    const matrix=[];
    for(const difficulty of difficulties)for(const contact of contacts)for(let zone=1;zone<=9;zone++){
     const p=api.hitProbability(contact,zone,difficulty);
     matrix.push({contact,zone,difficulty,p,hit:api.resolveSwingHit(contact,zone,difficulty,p-0.000001),out:api.resolveSwingHit(contact,zone,difficulty,p+0.000001)});
    }
    const p=(contact,zone,difficulty)=>api.hitProbability(contact,zone,difficulty);
    return {
     matrix,
     contact:difficulties.every(d=>[1,2,3,4,5,6,7,8,9].every(z=>p('HARD',z,d)>p('MEDIUM',z,d)&&p('MEDIUM',z,d)>p('SOFT',z,d))),
     zone:difficulties.every(d=>contacts.every(c=>p(c,5,d)>p(c,2,d)&&p(c,2,d)>p(c,1,d))),
     difficulty:contacts.every(c=>[1,2,3,4,5,6,7,8,9].every(z=>p(c,z,'Rookie')>p(c,z,'Veteran')&&p(c,z,'Veteran')>p(c,z,'All-Star'))),
     invalidRolls:[-1,1,Number.NaN].map(roll=>{try{api.resolveSwingHit('HARD',5,'Rookie',roll);return false}catch{return true}})
    };
   });
   assert.equal(result.matrix.length,81);
   assert.equal(result.contact,true,'contact must independently affect every zone/difficulty');
   assert.equal(result.zone,true,'center vs edge vs corner must independently affect every contact/difficulty');
   assert.equal(result.difficulty,true,'difficulty must independently affect every contact/zone');
   assert.ok(result.matrix.every(x=>x.p>0&&x.p<1&&x.hit===true&&x.out===false),'seeded hit/out boundary checks must hold for every combination');
   assert.deepEqual(result.invalidRolls,[true,true,true]);
  }finally{await browser.close()}
 });
}

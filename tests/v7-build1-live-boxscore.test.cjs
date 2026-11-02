'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R'});
const away=api.createProfile({id:'son',name:'Son',team:'Tampa Warriors',hand:'L'});
const swing=(m,outcome)=>api.recordSwing(m,{zone:'MC',power:'hard',outcome});
test('live box score reports hits, outs, inning runs and exact score without changing saved game',()=>{
 let m=api.newMatch(home,away,3);
 m=swing(m,'single');m=swing(m,'double');m=swing(m,'homer');
 m=swing(m,'out');m=swing(m,'out');m=swing(m,'out');
 m=swing(m,'triple');m=swing(m,'single');
 const raw=JSON.stringify(m),box=api.boxScore(m);
 assert.equal(JSON.stringify(m),raw,'derived statistics must never change saved match');
 assert.equal(box.away.hits,3);
 assert.equal(box.away.singles,1);
 assert.equal(box.away.doubles,1);
 assert.equal(box.away.homeRuns,1);
 assert.equal(box.away.runs,3);
 assert.equal(box.away.runsByInning[1],3);
 assert.equal(box.away.outs,3);
 assert.equal(box.home.hits,2);
 assert.equal(box.home.triples,1);
 assert.equal(box.home.singles,1);
 assert.equal(box.home.runs,1);
 assert.equal(box.home.runsByInning[1],1);
 assert.equal(box.half,'bottom');
 assert.equal(box.inning,1);
 assert.equal(box.status,'active');
 assert.deepEqual(api.boxScore(JSON.parse(raw)),box,'reload must preserve derived box score');
 const forged=JSON.parse(raw);forged.score.son=50;
 assert.throws(()=>api.boxScore(forged),/Invalid match/,'invalid persisted state cannot produce misleading stats');
});
test('score summary stays consistent through full simulated 3-, 6- and 9-inning games',()=>{
 for(const innings of [3,6,9]){
  let m=api.newMatch(home,away,innings);
  for(let step=0;step<1200&&m.status==='active';step++){
   const zone=['UL','UC','UR','ML','MC','MR','LL','LC','LR'][step%9];
   const power=['soft','medium','hard'][step%3];
   m=api.recordSwing(m,{zone,power,outcome:api.resolveSimulatedOutcome(m,{zone,power})});
  }
  assert.equal(m.status,'final');
  const score=api.boxScore(m);
  for(const team of [score.home,score.away]){
   assert.equal(team.runs,Object.values(team.runsByInning).reduce((a,b)=>a+b,0));
   assert.equal(team.hits,team.singles+team.doubles+team.triples+team.homeRuns);
   assert.equal(team.atBats,team.hits+team.outs);
  }
  assert.equal(score.winner,m.winner);
 }
});

'use strict';
// V7 Build 1: deterministic full-game skill simulation and immutable replay integrity.
// Isolated test only; no browser storage, production keys, or legacy save migration.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');

const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R'});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',hand:'L'});
const zones=['UL','UC','UR','ML','MC','MR','LL','LC','LR'];
const powers=['soft','medium','hard'];

function play(innings) {
 let match=api.newMatch(home,away,innings);
 const initial=JSON.stringify(match);
 let transitions=0,scoring=0;
 for(let step=0;step<1200&&match.status==='active';step++){
  const zone=zones[step%zones.length],power=powers[Math.floor(step/3)%powers.length];
  const before=JSON.stringify(match);
  const outcome=api.resolveSimulatedOutcome(match,{zone,power});
  assert.equal(JSON.stringify(match),before,'resolver must not mutate the live match');
  assert.equal(outcome,api.resolveSimulatedOutcome(match,{zone,power}),'same state and input must resolve identically');
  const next=api.recordSwing(match,{zone,power,outcome});
  assert.equal(JSON.stringify(match),before,'recordSwing must not mutate the previous snapshot');
  assert.equal(next.atBats.length,match.atBats.length+1);
  assert.equal(next.atBats.at(-1).outcome,outcome);
  assert.equal(next.atBats.at(-1).zone,zone);
  assert.equal(next.atBats.at(-1).power,power);
  assert.equal(api.validateMatch(next).ok,true,'each saved state must replay exactly at swing '+step);
  if(next.half!==match.half||next.inning!==match.inning) {
   transitions++;
   assert.equal(next.outs,0);
   assert.deepEqual(next.bases,[false,false,false]);
  }
  if(next.score[home.id]+next.score[away.id]>match.score[home.id]+match.score[away.id])scoring++;
  match=JSON.parse(JSON.stringify(next)); // emulate serialized reload after every swing
 }
 assert.equal(match.status,'final','game must reach final within safety bound');
 assert.ok(match.inning>=innings);
 assert.ok(transitions>=innings*2-1,'must play required half-innings unless home leads after top final');
 assert.ok(scoring>0,'simulation should produce scoring opportunities');
 assert.equal(api.validateMatch(match).ok,true);
 assert.notEqual(JSON.stringify(match),initial);
 const tampered=structuredClone(match);
 tampered.score[home.id]++;
 assert.equal(api.validateMatch(tampered).ok,false,'forged score must be rejected');
 const wrongRunner=structuredClone(match);
 wrongRunner.bases[0]=!wrongRunner.bases[0];
 assert.equal(api.validateMatch(wrongRunner).ok,false,'forged runner occupancy must be rejected');
 const wrongOuts=structuredClone(match);
 wrongOuts.outs=(wrongOuts.outs+1)%3;
 assert.equal(api.validateMatch(wrongOuts).ok,false,'forged outs must be rejected');
}

for(const innings of [3,6,9])
 test('V7 skill-derived '+innings+'-inning game: all zones, full replay, reload and tamper rejection',()=>play(innings));

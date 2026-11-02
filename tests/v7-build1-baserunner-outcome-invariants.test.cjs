'use strict';
// Build 1 baseball-rule invariants for all eight base occupancies and all outcomes.
// Engine-only tests: no browser storage, no V6.3 keys, no production state.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createProfile,newMatch,recordSwing,scoreRuns,validateMatch}=require('../v7/pass-and-play.cjs');
const home=createProfile({id:'home',name:'Dad',team:'Tampa Titans',hand:'R'});
const away=createProfile({id:'away',name:'Maddon',team:'Tampa Warriors',hand:'L'});
const outcomes=['out','single','double','triple','homer'];
const basesFor=mask=>[0,1,2].map(i=>Boolean(mask&(1<<i)));
function expectedAdvance(bases,outcome){
 const n={single:1,double:2,triple:3,homer:4}[outcome]||0;
 if(!n)return {bases:[...bases],runs:0};
 const next=[false,false,false];let runs=n===4?1:0;
 for(let i=0;i<3;i++)if(bases[i]){if(i+n>=3)runs++;else next[i+n]=true;}
 if(n<4)next[n-1]=true;
 return {bases:next,runs};
}
test('every base occupancy and hit outcome preserves exact runners and scoring',()=>{
 for(let mask=0;mask<8;mask++)for(const outcome of outcomes){
  const bases=basesFor(mask),snapshot=JSON.stringify(bases);
  const expected=expectedAdvance(bases,outcome);
  const actual=scoreRuns(bases,outcome);
  assert.deepEqual(actual,expected,JSON.stringify({mask,outcome}));
  assert.equal(JSON.stringify(bases),snapshot,'advance must not mutate input bases');
  if(outcome==='homer'){
   assert.deepEqual(actual.bases,[false,false,false]);
   assert.equal(actual.runs,1+bases.filter(Boolean).length);
  }
 }
});
test('recording an out cannot move runners or score; third out resets bases and hands off',()=>{
 let match=newMatch(home,away,3);
 match=recordSwing(match,{zone:'MC',power:'hard',outcome:'single'});
 assert.deepEqual(match.bases,[true,false,false]);
 const before=JSON.stringify(match);
 const first=recordSwing(match,{zone:'UC',power:'soft',outcome:'out'});
 assert.equal(JSON.stringify(match),before,'previous game snapshot remains immutable');
 assert.deepEqual(first.bases,[true,false,false]);
 assert.equal(first.outs,1);
 assert.equal(first.score.away,0);
 const second=recordSwing(first,{zone:'UR',power:'soft',outcome:'out'});
 const third=recordSwing(second,{zone:'UL',power:'soft',outcome:'out'});
 assert.equal(third.half,'bottom');
 assert.equal(third.inning,1);
 assert.equal(third.outs,0);
 assert.deepEqual(third.bases,[false,false,false]);
 assert.equal(third.score.away,0);
 assert.equal(third.atBats.length,4);
 assert.equal(validateMatch(third).ok,true);
});
test('grand slam awards exactly four runs and validates after JSON reload',()=>{
 let m=newMatch(home,away,3);
 for(const zone of ['UL','UC','UR'])m=recordSwing(m,{zone,power:'medium',outcome:'single'});
 assert.deepEqual(m.bases,[true,true,true]);
 m=recordSwing(m,{zone:'MC',power:'hard',outcome:'homer'});
 assert.equal(m.score.away,4);
 assert.deepEqual(m.bases,[false,false,false]);
 assert.equal(m.atBats.at(-1).runs,4);
 assert.equal(validateMatch(JSON.parse(JSON.stringify(m))).ok,true);
 const altered=JSON.parse(JSON.stringify(m));
 altered.atBats.at(-1).runs=3;
 assert.equal(validateMatch(altered).ok,false,'altered scoring history must be rejected');
});

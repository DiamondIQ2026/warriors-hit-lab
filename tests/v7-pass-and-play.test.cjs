'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createProfile,newMatch,recordSwing,currentTurn,scoreRuns}=require('../v7/pass-and-play.cjs');
const dad=createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R',lineup:Array.from({length:9},(_,i)=>'Titan '+(i+1))});
const madd=createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',hand:'L',lineup:Array.from({length:9},(_,i)=>'Warrior '+(i+1))});
const swing=(m,outcome='out')=>recordSwing(m,{zone:'MC',power:'hard',outcome});
test('profiles independently retain hand, team and nine unique lineup positions',()=>{
 assert.equal(dad.team,'Tampa Titans');assert.equal(madd.team,'Tampa Warriors');assert.equal(madd.hand,'L');
 assert.equal(newMatch(dad,madd).battingOrder.maddon,0);
 assert.throws(()=>createProfile({id:'bad',name:'Bad',team:'Bad',lineup:['only one']}));
});
test('exactly three outs hand off the phone to the other team',()=>{
 let m=newMatch(dad,madd,3);
 assert.equal(currentTurn(m).playerId,'maddon');
 m=swing(m);m=swing(m);assert.equal(currentTurn(m).playerId,'maddon');
 m=swing(m);assert.equal(currentTurn(m).playerId,'dad');
 assert.equal(m.inning,1);assert.equal(m.half,'bottom');assert.equal(m.outs,0);
 assert.deepEqual(m.atBats.map(x=>x.teamId),['maddon','maddon','maddon']);
 assert.equal(m.realSwings.maddon,3);assert.equal(m.realSwings.dad,0);
});
test('singles, doubles, triples and homers advance bases and award runs',()=>{
 let m=newMatch(dad,madd);
 for(const outcome of ['single','double','triple','homer'])m=swing(m,outcome);
 assert.ok(m.score.maddon>=4);
 assert.equal(m.realSwings.maddon,4);assert.equal(m.atBats[3].outcome,'homer');
 assert.deepEqual(scoreRuns([true,true,true],'homer'),{bases:[false,false,false],runs:4});
});
test('batting order rotates per team independently after nine at-bats',()=>{
 let m=newMatch(dad,madd);
 for(let i=0;i<9;i++)m=swing(m,'single');
 assert.equal(m.battingOrder.maddon,0);
 assert.equal(m.battingOrder.dad,0);
 assert.equal(m.atBats[8].index,8);
});
test('away wins after three full innings and game forbids further swings',()=>{
 let m=newMatch(dad,madd,3);
 for(let inning=1;inning<=3;inning++){
   if(inning===1)m=swing(m,'homer');
   for(let j=0;j<3;j++)m=swing(m,'out');
   for(let j=0;j<3;j++)m=swing(m,'out');
 }
 assert.equal(m.status,'final');assert.equal(m.winner,'maddon');
 assert.equal(m.inning,3);
 assert.throws(()=>swing(m));
});
test('home walkoff ends immediately during final inning',()=>{
 let m=newMatch(dad,madd,3);
 for(let inning=1;inning<=3;inning++){
  for(let j=0;j<3;j++)m=swing(m);
  if(inning<3)for(let j=0;j<3;j++)m=swing(m);
 }
 assert.equal(m.half,'bottom');assert.equal(m.inning,3);
 m=swing(m,'homer');
 assert.equal(m.status,'final');assert.equal(m.winner,'dad');assert.equal(m.outs,0);
});
test('tied regulation moves into extra innings',()=>{
 let m=newMatch(dad,madd,3);
 for(let i=0;i<18;i++)m=swing(m);
 assert.equal(m.inning,4);assert.equal(m.half,'top');assert.equal(m.status,'active');
});
test('match updates are immutable and reloadable through JSON',()=>{
 let m=newMatch(dad,madd);
 const before=m;
 m=swing(m,'single');
 assert.equal(before.atBats.length,0);assert.equal(before.realSwings.maddon,0);
 assert.deepEqual(JSON.parse(JSON.stringify(m)),m);
 assert.equal(m.atBats[0].kind,'real-swing');
});
test('invalid inputs do not mutate match',()=>{
 const m=newMatch(dad,madd);
 assert.throws(()=>recordSwing(m,{zone:'ZZ',power:'hard',outcome:'homer'}));
 assert.deepEqual(m.atBats,[]);assert.equal(m.score.maddon,0);
 assert.throws(()=>newMatch(dad,dad));
});

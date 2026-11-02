'use strict';
// Deterministic V7-only engine coverage for complete-game scoring and save integrity.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createProfile,newMatch,recordSwing,currentTurn}=require('../v7/pass-and-play.cjs');
const lineup=prefix=>Array.from({length:9},(_,i)=>prefix+' '+(i+1));
const home=createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R',lineup:lineup('Titan')});
const away=createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',hand:'L',lineup:lineup('Warrior')});
const swing=(m,outcome='out')=>recordSwing(m,{zone:'MC',power:'hard',outcome});
function bottomOfThird(awayLead=0){
 let m=newMatch(home,away,3);
 for(let i=0;i<awayLead;i++)m=swing(m,'homer');
 for(let i=0;i<15;i++)m=swing(m,'out');
 assert.equal(m.inning,3);assert.equal(m.half,'bottom');assert.equal(m.outs,0);
 for(let i=0;i<3;i++)m=swing(m,'single');
 assert.deepEqual(m.bases,[true,true,true]);
 return m;
}
function assertWalkoff(before,after,credited){
 assert.equal(after.status,'final');assert.equal(after.winner,home.id);
 assert.equal(after.score[home.id]-before.score[home.id],credited);
 assert.equal(after.atBats.at(-1).runs,credited,'play log matches credited runs');
 assert.equal(after.realSwings[home.id],before.realSwings[home.id]+1);
 assert.equal(after.atBats.length,before.atBats.length+1);
 assert.deepEqual(JSON.parse(JSON.stringify(after)),after,'final state is JSON-reloadable');
 assert.throws(()=>swing(after,'out'),/complete/,'finished game rejects new swings');
 assert.equal(before.status,'active','immutable source remains active');
}
test('complete three-inning tie: loaded double awards winning run only',()=>{
 const before=bottomOfThird(),after=swing(before,'double');
 assertWalkoff(before,after,1);
 assert.equal(after.score.dad,1);assert.equal(after.score.maddon,0);
});
test('down one in third: loaded triple awards exactly two runs',()=>{
 const before=bottomOfThird(1),after=swing(before,'triple');
 assertWalkoff(before,after,2);
 assert.equal(after.score.dad,2);assert.equal(after.score.maddon,1);
});
test('walkoff grand slam credits all four runs, not only the winning run',()=>{
 const before=bottomOfThird(1),after=swing(before,'homer');
 assertWalkoff(before,after,4);
 assert.equal(after.score.dad,4);
});
test('earlier-inning bases-loaded double credits all runs and game continues',()=>{
 let m=newMatch(home,away,3);
 for(let i=0;i<3;i++)m=swing(m,'out');
 assert.equal(currentTurn(m).playerId,'dad');
 for(let i=0;i<3;i++)m=swing(m,'single');
 const before=m,after=swing(m,'double');
 assert.equal(after.score.dad-before.score.dad,2);
 assert.equal(after.atBats.at(-1).runs,2);
 assert.equal(after.status,'active');
});
test('visiting batter receives full bases-loaded triple without walkoff',()=>{
 let m=newMatch(home,away,3);
 for(let i=0;i<3;i++)m=swing(m,'single');
 const before=m,after=swing(m,'triple');
 assert.equal(after.score.maddon-before.score.maddon,3);
 assert.equal(after.atBats.at(-1).runs,3);
 assert.equal(after.status,'active');
});
test('extra-inning loaded triple credits only runs needed to win',()=>{
 let m=newMatch(home,away,3);
 for(let i=0;i<18;i++)m=swing(m,'out');
 assert.equal(m.inning,4);assert.equal(m.half,'top');
 for(let i=0;i<3;i++)m=swing(m,'out');
 for(let i=0;i<3;i++)m=swing(m,'single');
 const before=m,after=swing(m,'triple');
 assertWalkoff(before,after,1);
 assert.equal(after.inning,4);
});

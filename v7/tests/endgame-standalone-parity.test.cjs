'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../pass-and-play.cjs');
const finish=require('../alpha/game-finish-rules.cjs');
function match(){
 const home=engine.createProfile({id:'dad',name:'Dad',team:'Titans'});
 const away=engine.createProfile({id:'maddon',name:'Maddon',team:'Warriors'});
 return engine.newMatch(home,away,3);
}
const swing=(m,outcome='out')=>engine.recordSwing(m,{zone:'MC',power:'medium',outcome});
test('top-third-out final lead ends game consistently in standalone engine',()=>{
 let m=match();m.inning=3;m.half='top';m.outs=2;m.score.dad=3;m.score.maddon=1;
 const n=swing(m);
 assert.equal(n.status,'final');assert.equal(n.winner,'dad');
 assert.equal(finish.decision({inning:3,scheduled:3,half:'top',home:3,away:1,thirdOut:true}).winner,'home');
});
test('bottom-third-out visitor win is final',()=>{
 let m=match();m.inning=3;m.half='bottom';m.outs=2;m.score.dad=1;m.score.maddon=3;
 const n=swing(m);
 assert.equal(n.status,'final');assert.equal(n.winner,'maddon');
});
test('bottom final-inning walkoff home run ends immediately',()=>{
 let m=match();m.inning=3;m.half='bottom';m.outs=1;m.score.dad=2;m.score.maddon=2;
 const n=swing(m,'homer');
 assert.equal(n.status,'final');assert.equal(n.winner,'dad');assert.equal(n.score.dad,3);
});
test('tied bottom-third-out advances to extras, preserves input and batting order',()=>{
 let m=match();m.inning=3;m.half='bottom';m.outs=2;m.score.dad=2;m.score.maddon=2;m.bases=[true,false,true];
 const before=JSON.stringify(m),n=swing(m);
 assert.equal(n.status,'active');assert.equal(n.inning,4);assert.equal(n.half,'top');
 assert.equal(n.outs,0);assert.deepEqual(n.bases,[false,false,false]);
 assert.equal(n.battingOrder.dad,1);assert.equal(JSON.stringify(m),before);
});

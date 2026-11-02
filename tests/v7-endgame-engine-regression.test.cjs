'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../v7/pass-and-play.cjs');
const finish=require('../v7/alpha/game-finish-rules.cjs');
function setup(overrides={}){
 const home=engine.createProfile({id:'dad',name:'Dad',team:'Titans'});
 const away=engine.createProfile({id:'maddon',name:'Maddon',team:'Warriors'});
 const match=engine.newMatch(home,away,3);
 match.inning=3;match.half='bottom';match.outs=2;
 Object.assign(match,overrides);
 return match;
}
function out(match){return engine.recordSwing(match,{zone:'MC',power:'medium',outcome:'out'});}
test('home leading after final top third out completes game',()=>{
 const m=setup({half:'top',score:{dad:4,maddon:2}});
 const next=out(m);
 assert.equal(next.status,'final');assert.equal(next.winner,'dad');
 assert.equal(finish.decision({inning:3,scheduled:3,half:'top',home:4,away:2,thirdOut:true}).kind,'final');
});
test('visitors leading after final bottom third out win',()=>{
 const next=out(setup({score:{dad:1,maddon:4}}));
 assert.equal(next.status,'final');assert.equal(next.winner,'maddon');
});
test('tie at bottom third out starts fourth inning and resets runners',()=>{
 const m=setup({score:{dad:3,maddon:3},bases:[true,true,false]});
 const original=JSON.stringify(m);
 const next=out(m);
 assert.equal(next.status,'active');assert.equal(next.inning,4);assert.equal(next.half,'top');
 assert.equal(next.outs,0);assert.deepEqual(next.bases,[false,false,false]);
 assert.equal(JSON.stringify(m),original);
});
test('walkoff homer finishes immediately without three outs',()=>{
 const m=setup({outs:1,score:{dad:2,maddon:2}});
 const n=engine.recordSwing(m,{zone:'MC',power:'medium',outcome:'homer'});
 assert.equal(n.status,'final');assert.equal(n.score.dad,3);assert.equal(n.winner,'dad');
});

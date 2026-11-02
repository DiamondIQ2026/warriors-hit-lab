'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../v7/pass-and-play.cjs');
function match(){
 const home=engine.createProfile({id:'home',name:'Dad',team:'Titans'});
 const away=engine.createProfile({id:'away',name:'Maddon',team:'Warriors'});
 return engine.newMatch(home,away,3);
}
const swing=(m,outcome)=>engine.recordSwing(m,{zone:'MC',power:'medium',outcome});
test('tied regulation, extra-inning away lead, and home bottom-half walkoff form a complete deterministic game',()=>{
 let game=match();
 for(let inning=1;inning<=3;inning++){
  for(let i=0;i<3;i++)game=swing(game,'out');
  assert.equal(game.half,'bottom');
  for(let i=0;i<3;i++)game=swing(game,'out');
 }
 assert.equal(game.inning,4);assert.equal(game.status,'active');
 game=swing(game,'homer');
 assert.equal(game.score.away,1);
 for(let i=0;i<3;i++)game=swing(game,'out');
 assert.equal(game.half,'bottom');assert.equal(game.status,'active');
 game=swing(game,'homer');
 assert.equal(game.score.home,1);assert.equal(game.status,'active');
 game=swing(game,'homer');
 assert.equal(game.score.home,2);assert.equal(game.status,'final');
 assert.equal(game.winner,'home');
 assert.throws(()=>swing(game,'out'),/complete/);
});
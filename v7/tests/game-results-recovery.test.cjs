'use strict';
// Experimental V7-only game recovery and Results navigation regression.
// The V6.3 sentinel is never modified and no saved data is automatically repaired.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'V7 inline script');
const anchor="el('menuButton').onclick=";
assert.ok(source.includes(anchor),'V7 test hook');
const script=source.replace(anchor,
 "window.__guard=()=>({state,health:gameSessionHealth(),game:game(),results:results(),play:play(),canResume:canResumeGame()});window.__swing=swing;"+anchor);

function boot(saved=null){
 const elements={},listeners={},writes=[],storage={
  'hitlab-v7-visual-prototype-only':saved===null?null:JSON.stringify(saved),
  'hitlab-v6.3-production':'legacy-sentinel'
 };
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',clientWidth:300,clientHeight:250,disabled:false,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>({style:{setProperty(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 const random=Object.create(Math);random.random=()=>.99;
 vm.runInNewContext(script,{document,window,Math:random,setTimeout(){},
  localStorage:{getItem:key=>storage[key]??null,
   setItem:(key,value)=>{writes.push([key,value]);storage[key]=value}}});
 return {read:window.__guard,swing:window.__swing,writes,storage,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}})};
}
function savedGame(overrides={}){
 return {mode:'Family Rivalry',gameStarted:true,gameFinished:false,
  inning:3,innings:3,outs:1,home:4,away:2,reps:7,hits:4,
  bases:[true,false,true],log:['SINGLE!'],handoff:true,rivalryTurn:'away',
  rivalryStats:{away:{reps:4,hits:2},home:{reps:3,hits:2}},
  trainingReps:2,trainingHits:1,trainingLog:[
   {zone:5,contact:'HARD',hit:true},{zone:3,contact:'SOFT',hit:false}
  ],...overrides};
}
function gameSnapshot(s){return JSON.stringify({
 mode:s.mode,inning:s.inning,outs:s.outs,home:s.home,away:s.away,
 reps:s.reps,hits:s.hits,bases:s.bases,log:s.log,handoff:s.handoff,
 rivalryTurn:s.rivalryTurn,rivalryStats:s.rivalryStats
});}
test('opening Results from the menu never ends or resets an active Family Rivalry game',()=>{
 const app=boot(savedGame()),s=app.read().state,before=gameSnapshot(s);
 app.click({go:'Results'});
 assert.equal(s.screen,'Results');
 assert.equal(s.gameFinished,false);
 assert.equal(gameSnapshot(s),before);
 const page=app.read().results;
 assert.match(page,/GAME STILL IN PROGRESS/);
 assert.match(page,/id="resumeGame"/);
 assert.doesNotMatch(page,/PLAY AGAIN/);
 app.click({},'resumeGame');
 assert.equal(s.screen,'Game');
 assert.equal(gameSnapshot(s),before);
 assert.equal(s.handoff,true);
});
test('Results menu cannot start an unconfirmed replacement game',()=>{
 const app=boot(savedGame()),s=app.read().state,before=gameSnapshot(s);
 app.click({go:'Results'});
 app.click({go:'Game'});
 assert.equal(s.screen,'Game','returning to game is not a restart');
 assert.equal(gameSnapshot(s),before);
 assert.equal(s.gameFinished,false);
});
test('no completed game shows no misleading final score or Play Again action',()=>{
 const app=boot();
 assert.match(app.read().results,/NO COMPLETED GAME/);
 assert.doesNotMatch(app.read().results,/PLAY AGAIN|Final Score/);
 assert.equal(app.writes.length,0);
});
test('a genuinely finished game retains its final scoreboard and Play Again action',()=>{
 const app=boot(savedGame({gameStarted:false,gameFinished:true,handoff:false,
  finalReason:'Completed 3 innings.',inning:4,bases:[false,false,false]}));
 const page=app.read().results;
 assert.match(page,/Final Score/);
 assert.match(page,/PLAY AGAIN ▶/);
 assert.match(page,/Player Comparison/);
 assert.doesNotMatch(page,/GAME STILL IN PROGRESS/);
});
for(const [name,patch,reason] of [
 ['missing runner array',{bases:null},/baserunner positions/],
 ['string score',{home:'4'},/scores or batting totals/],
 ['negative outs',{outs:-1},/outs/],
 ['missing play history',{log:null},/play-by-play/],
 ['invalid batting turn',{rivalryTurn:'neither'},/batting turn/],
 ['missing rivalry statistics',{rivalryStats:null},/player statistics/],
 ['inconsistent hit totals',{hits:9,reps:7},/batting totals/],
 ['unsupported inning count',{innings:5},/inning settings/]
]){
 test('invalid save is quarantined without mutation: '+name,()=>{
  const app=boot(savedGame(patch)),s=app.read().state;
  const before=gameSnapshot(s);
  assert.equal(app.read().health.ok,false);
  assert.match(app.read().health.reason,reason);
  assert.equal(app.writes.length,0,'validation must not rewrite storage');
  app.click({},'resumeGame');
  assert.match(app.read().game,/GAMEPLAY PAUSED — PROGRESS PROTECTED/);
  assert.match(app.read().game,/REVIEW GAME SETUP/);
  assert.doesNotMatch(app.read().game,/id="swing"/);
  app.swing();
  assert.equal(gameSnapshot(s),before,'blocked swing must not alter game');
  assert.equal(s.trainingReps,2);
  assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
  assert.equal(app.storage['hitlab-v6.3-production'],'legacy-sentinel');
 });
}
test('invalid game can be reviewed, cancelled and explicitly restarted without losing training',()=>{
 const app=boot(savedGame({log:null})),s=app.read().state;
 app.click({},'resumeGame');
 app.click({go:'Play'});
 assert.match(app.read().play,/SAVED GAME NEEDS REVIEW/);
 const before=gameSnapshot(s);
 app.click({go:'Game'});
 assert.match(app.read().play,/REPLACE CURRENT GAME/);
 app.click({},'cancelNewGame');
 assert.equal(gameSnapshot(s),before);
 app.click({go:'Game'});
 app.click({},'confirmNewGame');
 assert.equal(s.gameStarted,true);
 assert.equal(s.gameFinished,false);
 assert.equal(s.inning,1);
 assert.equal(s.home,0);
 assert.equal(s.away,0);
 assert.equal(s.reps,0);
 assert.equal(s.hits,0);
 assert.equal(s.log.length,0);
 assert.equal(app.read().health.ok,true);
 assert.equal(s.trainingReps,2);
 assert.equal(s.trainingHits,1);
 assert.equal(s.trainingLog.length,2);
 assert.equal(app.storage['hitlab-v6.3-production'],'legacy-sentinel');
});
test('valid saved Family Rivalry handoff resumes without false quarantine',()=>{
 const app=boot(savedGame()),s=app.read().state;
 assert.equal(app.read().health.ok,true);
 app.click({},'resumeGame');
 assert.match(app.read().game,/PASS THE PHONE/);
 assert.equal(s.handoff,true);
 assert.equal(s.away,2);
 assert.equal(s.home,4);
});
test('invalid final summary is guarded rather than crashing Results',()=>{
 const app=boot(savedGame({gameStarted:false,gameFinished:true,
  finalReason:null,handoff:false}));
 assert.equal(app.read().health.ok,false);
 assert.match(app.read().results,/GAMEPLAY PAUSED/);
 assert.doesNotMatch(app.read().results,/PLAY AGAIN/);
});

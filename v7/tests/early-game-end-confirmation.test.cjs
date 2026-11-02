'use strict';
// Experimental V7 early-End-Game confirmation regressions. No production or V6.3 writes.
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
 "window.__end=()=>({state,pendingEndGame,game:game(),results:results(),health:gameSessionHealth()});window.__swing=swing;"+anchor);
const KEY='hitlab-v7-visual-prototype-only';
const LEGACY='hitlab-v6.3-production';

function savedGame(overrides={}){
 return {mode:'Family Rivalry',gameStarted:true,gameFinished:false,
  inning:3,innings:3,outs:1,home:4,away:2,reps:7,hits:4,
  bases:[true,false,true],log:['SINGLE!'],handoff:false,rivalryTurn:'home',
  rivalryStats:{away:{reps:4,hits:2},home:{reps:3,hits:2}},
  trainingReps:2,trainingHits:1,trainingLog:[
   {zone:5,contact:'HARD',hit:true},{zone:3,contact:'SOFT',hit:false}
  ],...overrides};
}
function boot(saved=savedGame()){
 const elements={},listeners={},writes=[],focusEvents=[],storage={
  [KEY]:JSON.stringify(saved),[LEGACY]:'untouched-v6.3-sentinel'
 };
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',clientWidth:300,clientHeight:250,disabled:false,
  focus(){focusEvents.push(id)}, 
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
 return {read:window.__end,swing:window.__swing,writes,storage,focusEvents,
  keydown:(key)=>{let prevented=false;listeners.keydown({key,preventDefault(){prevented=true}});return prevented}, 
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}})};
}
function gameSnapshot(s){
 return JSON.stringify({mode:s.mode,inning:s.inning,outs:s.outs,home:s.home,
  away:s.away,reps:s.reps,hits:s.hits,bases:s.bases,log:s.log,
  handoff:s.handoff,rivalryTurn:s.rivalryTurn,
  rivalryStats:s.rivalryStats,gameStarted:s.gameStarted,gameFinished:s.gameFinished,
  finalReason:s.finalReason,trainingReps:s.trainingReps,
  trainingHits:s.trainingHits,trainingLog:s.trainingLog});
}
test('End Game displays accessible confirmation instead of immediately finalizing',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 const before=gameSnapshot(s),saved=app.storage[KEY],writes=app.writes.length;
 assert.match(app.read().game,/id="endGame"/);
 app.click({},'endGame');
 assert.equal(app.read().pendingEndGame,true);
 assert.equal(gameSnapshot(s),before);
 assert.equal(app.storage[KEY],saved);
 assert.equal(app.writes.length,writes);
 assert.match(app.read().game,/role="alertdialog"/);
 assert.match(app.read().game,/aria-labelledby="endGameTitle"/);
 assert.match(app.read().game,/KEEP PLAYING/);
 assert.match(app.read().game,/END GAME & VIEW RESULTS/);
 assert.doesNotMatch(app.read().game,/id="swing"/);
});
test('cancel preserves score, baserunners, player handoff and training without writes',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 const before=gameSnapshot(s),saved=app.storage[KEY],writes=app.writes.length;
 app.click({},'endGame');
 app.click({},'cancelEndGame');
 assert.equal(app.read().pendingEndGame,false);
 assert.equal(gameSnapshot(s),before);
 assert.equal(app.storage[KEY],saved);
 assert.equal(app.writes.length,writes);
 assert.match(app.read().game,/id="swing"/);
 assert.equal(app.storage[LEGACY],'untouched-v6.3-sentinel');
});
test('confirmed End Game records a final score and preserves training and legacy data',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 const before={home:s.home,away:s.away,inning:s.inning,outs:s.outs,bases:JSON.stringify(s.bases)};
 app.click({},'endGame');
 app.click({},'confirmEndGame');
 assert.equal(s.gameFinished,true);
 assert.equal(s.gameStarted,false);
 assert.equal(s.screen,'Results');
 assert.equal(app.read().pendingEndGame,false);
 assert.match(s.finalReason,/Game ended early by player/);
 assert.match(app.read().results,/Final Score/);
 assert.equal(s.home,before.home);
 assert.equal(s.away,before.away);
 assert.equal(s.inning,before.inning);
 assert.equal(s.outs,before.outs);
 assert.equal(JSON.stringify(s.bases),before.bases);
 assert.equal(s.trainingReps,2);
 assert.equal(s.trainingHits,1);
 assert.equal(s.trainingLog.length,2);
 assert.equal(app.storage[LEGACY],'untouched-v6.3-sentinel');
 assert.ok(app.writes.every(([key])=>key===KEY));
});
test('a stale confirmation cannot finish a game after navigating away',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 app.click({},'endGame');
 app.click({go:'Home'});
 assert.equal(app.read().pendingEndGame,false);
 app.click({},'confirmEndGame');
 assert.equal(s.screen,'Home');
 assert.equal(s.gameFinished,false);
 assert.equal(s.gameStarted,true);
 app.click({},'resumeGame');
 assert.match(app.read().game,/id="swing"/);
});
test('Results navigation dismisses confirmation and keeps the game resumable',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 app.click({},'endGame');
 app.click({go:'Results'});
 assert.equal(app.read().pendingEndGame,false);
 assert.equal(s.gameFinished,false);
 assert.match(app.read().results,/GAME STILL IN PROGRESS/);
 app.click({},'confirmEndGame');
 assert.equal(s.gameFinished,false);
 app.click({},'resumeGame');
 assert.match(app.read().game,/id="swing"/);
});
test('a Family Rivalry pass-the-phone handoff cannot be ended through a stale button',()=>{
 const app=boot(savedGame({handoff:true,rivalryTurn:'away'})),s=app.read().state;
 app.click({},'resumeGame');
 assert.match(app.read().game,/PASS THE PHONE/);
 app.click({},'endGame');
 app.click({},'confirmEndGame');
 assert.equal(app.read().pendingEndGame,false);
 assert.equal(s.gameFinished,false);
 assert.equal(s.handoff,true);
 assert.equal(s.screen,'Game');
});
test('an invalid saved game cannot be finalized by synthetic End Game clicks',()=>{
 const app=boot(savedGame({bases:null})),s=app.read().state;
 app.click({},'resumeGame');
 assert.equal(app.read().health.ok,false);
 assert.match(app.read().game,/GAMEPLAY PAUSED/);
 app.click({},'endGame');
 app.click({},'confirmEndGame');
 assert.equal(app.read().pendingEndGame,false);
 assert.equal(s.gameFinished,false);
 assert.equal(s.bases,null);
});
test('End Game confirmation is blocked during a swing animation',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 s.animating=true;
 app.click({},'endGame');
 assert.equal(app.read().pendingEndGame,false);
 app.click({},'confirmEndGame');
 assert.equal(s.gameFinished,false);
 s.animating=false;
});
test('pending End Game confirmation blocks a stale swing action',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 app.click({},'endGame');
 const before=gameSnapshot(s),writes=app.writes.length;
 app.swing();
 assert.equal(gameSnapshot(s),before);
 assert.equal(app.writes.length,writes);
 assert.equal(s.animating,false);
});
test('cancel restores a working swing without changing the current inning first',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 app.click({},'endGame');
 app.click({},'cancelEndGame');
 const reps=s.reps,inning=s.inning;
 app.swing();
 assert.equal(s.reps,reps+1);
 assert.equal(s.inning,inning);
 assert.equal(s.gameFinished,false);
});
test('unconfirmed End Game does not survive reload or auto-finalize the save',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 const before=gameSnapshot(s);
 app.click({},'endGame');
 const restored=boot(JSON.parse(app.storage[KEY]));
 assert.equal(restored.read().pendingEndGame,false);
 assert.equal(restored.read().state.gameFinished,false);
 assert.equal(restored.read().state.gameStarted,true);
 assert.equal(gameSnapshot(restored.read().state),before);
 restored.click({},'resumeGame');
 assert.match(restored.read().game,/id="swing"/);
});
test('Exhibition games also require confirmation before ending early',()=>{
 const app=boot(savedGame({mode:'Exhibition',handoff:false})),s=app.read().state;
 app.click({},'resumeGame');
 app.click({},'endGame');
 assert.equal(s.gameFinished,false);
 app.click({},'confirmEndGame');
 assert.equal(s.gameFinished,true);
 assert.equal(s.screen,'Results');
});
test('confirmation focuses the safe action and returns focus after cancellation',()=>{
 const app=boot();
 app.click({},'resumeGame');
 app.click({},'endGame');
 assert.equal(app.focusEvents.at(-1),'cancelEndGame');
 app.click({},'cancelEndGame');
 assert.equal(app.focusEvents.at(-1),'endGame');
});
test('Escape cancels confirmation without ending or rewriting the active game',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 const before=gameSnapshot(s),writes=app.writes.length;
 app.click({},'endGame');
 assert.equal(app.keydown('Escape'),true);
 assert.equal(app.read().pendingEndGame,false);
 assert.equal(app.focusEvents.at(-1),'endGame');
 assert.equal(gameSnapshot(s),before);
 assert.equal(app.writes.length,writes);
 assert.equal(app.keydown('Escape'),false);
});

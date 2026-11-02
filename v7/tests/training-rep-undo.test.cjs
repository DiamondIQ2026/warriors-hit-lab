'use strict';
// V7-only Training Academy correction and saved-session safety regression suite.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 inline script present');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'test hook anchor exists');
const script=match[1].replace(anchor,
 "window.__undoTest=()=>({state,drill:drill(),goal:drillGoal(),next:drillNextStep(),report:report(),undo:undoTrainingRep,canUndo:canUndoTrainingRep,swing});"+anchor);
function boot({saved=null,random=.99}={}){
 const elements={},listeners={},timers=[],writes=[];let v7=saved;
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>({style:{setProperty(){}},classList:{add(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 const math=Object.create(Math);math.random=()=>random;
 vm.runInNewContext(script,{document,window,Math:math,
  localStorage:{getItem:key=>key==='hitlab-v7-visual-prototype-only'?v7:'legacy-v6.3-sentinel',
   setItem:(key,value)=>{writes.push([key,value]);if(key==='hitlab-v7-visual-prototype-only')v7=value}},
  setTimeout:fn=>timers.push(fn)});
 const api=window.__undoTest();
 return {...api,writes,read:()=>window.__undoTest(),saved:()=>v7,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}}),
  tick:()=>{const fn=timers.shift();assert.ok(fn,'animation timer exists');fn()}};
}
const gameSnapshot=state=>JSON.stringify({reps:state.reps,hits:state.hits,home:state.home,away:state.away,
 inning:state.inning,outs:state.outs,bases:state.bases,log:state.log,gameStarted:state.gameStarted,
 handoff:state.handoff,rivalryTurn:state.rivalryTurn});
test('undo control follows primary Record Rep and is initially disabled',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 const screen=app.read().drill;
 assert.ok(screen.indexOf('id="swing"')<screen.indexOf('id="undoTrainingRep"'));
 assert.ok(screen.indexOf('id="undoTrainingRep"')<screen.indexOf('id="ballfield"'));
 assert.match(screen,/id="undoTrainingRep" disabled/);
 assert.equal(app.read().canUndo(),false);
});
test('missed training rep can be undone without changing game score or saves',()=>{
 const app=boot();app.click({drill:'Quick Hands'});
 Object.assign(app.state,{gameStarted:true,home:4,away:2,inning:3,outs:2,reps:8,hits:5,
  bases:[true,false,true],log:['GAME'],handoff:true,rivalryTurn:'away'});
 const before=gameSnapshot(app.state);
 app.swing();app.tick();
 assert.equal(app.state.trainingReps,1);assert.equal(app.state.trainingHits,0);
 assert.equal(app.read().canUndo(),true);
 app.click({},'undoTrainingRep');
 assert.equal(app.state.trainingReps,0);assert.equal(app.state.trainingHits,0);
 assert.equal(app.state.trainingLog.length,0);
 assert.equal(app.read().goal.current,0);
 assert.equal(gameSnapshot(app.state),before);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});
test('undo of simulated hit reverses both rep and hit counters and analytics',()=>{
 const app=boot({random:0});app.click({drill:'Barrel Control'});
 app.swing();app.tick();
 assert.equal(app.state.trainingReps,1);assert.equal(app.state.trainingHits,1);
 assert.equal(app.read().goal.current,1);
 assert.equal(app.read().undo(),true);
 assert.equal(app.state.trainingReps,0);assert.equal(app.state.trainingHits,0);
 assert.equal(app.read().goal.current,0);
 assert.match(app.read().report,/0 repetitions · 0 hits/);
 assert.equal(app.read().undo(),false);
});
test('undo removes only the most recent repetition and updates focus prompt',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 app.state.trainingReps=5;app.state.trainingHits=0;
 app.state.trainingLog=[1,2,3,4,5].map(zone=>({zone,contact:'MEDIUM',hit:false}));
 assert.equal(app.read().next.status,'FOCUS GOAL REACHED');
 assert.equal(app.read().undo(),true);
 assert.equal(app.state.trainingReps,4);
 assert.equal(app.state.trainingLog.length,4);
 assert.equal(app.read().goal.current,4);
 assert.match(app.read().next.guidance,/unvisited Zone 5/);
});
test('undo reopens a completed 25-rep drill for the corrected final rep',()=>{
 const app=boot();app.click({drill:'Quick Hands'});
 for(let i=0;i<25;i++){app.swing();app.tick()}
 assert.equal(app.state.trainingReps,25);
 assert.doesNotMatch(app.read().drill,/id="swing"/);
 assert.equal(app.read().undo(),true);
 assert.equal(app.state.trainingReps,24);
 assert.match(app.read().drill,/id="swing"/);
 app.swing();app.tick();
 assert.equal(app.state.trainingReps,25);
 assert.equal(app.state.trainingLog.length,25);
});
test('undo is blocked during animation, including a rapid double tap',()=>{
 const app=boot();app.click({drill:'Power Challenge'});
 app.swing();const writes=app.writes.length;
 assert.equal(app.state.animating,true);
 assert.equal(app.read().canUndo(),false);
 app.click({},'undoTrainingRep');app.click({},'undoTrainingRep');
 assert.equal(app.state.trainingReps,1);
 assert.equal(app.writes.length,writes);
 app.tick();assert.equal(app.read().canUndo(),true);
});
test('malformed or inconsistent saved training logs are never guessed or changed',()=>{
 const app=boot();app.click({drill:'Quick Hands'});
 const cases=[
  {trainingReps:1,trainingHits:0,trainingLog:null},
  {trainingReps:2,trainingHits:0,trainingLog:[{zone:5,contact:'SOFT',hit:false}]},
  {trainingReps:1,trainingHits:0,trainingLog:[{zone:5,hit:false}]},
  {trainingReps:1,trainingHits:0,trainingLog:[{zone:5,contact:'HARD',hit:true}]},
  {trainingReps:1,trainingHits:2,trainingLog:[{zone:5,contact:'HARD',hit:true}]},
  {trainingReps:26,trainingHits:0,trainingLog:Array.from({length:26},()=>({zone:5,contact:'HARD',hit:false}))}
 ];
 for(const c of cases){
  Object.assign(app.state,c);
  const before=JSON.stringify(c),writes=app.writes.length;
  assert.equal(app.read().canUndo(),false);
  assert.equal(app.read().undo(),false);
  assert.equal(JSON.stringify({trainingReps:app.state.trainingReps,trainingHits:app.state.trainingHits,trainingLog:app.state.trainingLog}),before);
  assert.equal(app.writes.length,writes);
 }
});
test('undo cannot alter training from Game or Training Hub screens',()=>{
 const app=boot();app.click({drill:'Zone Precision'});app.swing();app.tick();
 app.click({go:'Training'});
 const before=JSON.stringify(app.state.trainingLog),writes=app.writes.length;
 app.click({},'undoTrainingRep');
 assert.equal(JSON.stringify(app.state.trainingLog),before);
 assert.equal(app.writes.length,writes);
 app.click({go:'Game'});app.click({},'undoTrainingRep');
 assert.equal(JSON.stringify(app.state.trainingLog),before);
 assert.equal(app.writes.length,writes+1);
});
test('corrected training progress survives reload and still protects V6.3 storage',()=>{
 const app=boot({random:0});app.click({drill:'Quick Hands'});
 app.swing();app.tick();app.click({},'undoTrainingRep');
 const saved=app.saved();assert.ok(saved);
 const reloaded=boot({saved});
 assert.equal(reloaded.state.trainingReps,0);
 assert.equal(reloaded.state.trainingHits,0);
 assert.equal(reloaded.state.trainingLog.length,0);
 assert.equal(reloaded.writes.length,0);
 reloaded.click({go:'Drill'});
 assert.equal(reloaded.read().canUndo(),false);
 assert.ok([...app.writes,...reloaded.writes].every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});

'use strict';
// V7-only fail-closed training session and zero-rep resume regressions.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 inline script exists');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor));
const script=match[1].replace(anchor,
 "window.__health=()=>({state,health:trainingSessionHealth(),canRecord:canRecordTrainingRep(),drill:drill(),training:training(),swing});"+anchor);
function boot(saved=null){
 const elements={},listeners={},timers=[],writes=[];let stored=saved;
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>({style:{setProperty(){}},classList:{add(){}},setAttribute(){}})};
 const window={scrollTo(){}};const random=Object.create(Math);random.random=()=>.99;
 vm.runInNewContext(script,{document,window,Math:random,
  localStorage:{getItem:key=>key==='hitlab-v7-visual-prototype-only'?stored:'v6.3-sentinel',
   setItem:(key,value)=>{writes.push([key,value]);if(key==='hitlab-v7-visual-prototype-only')stored=value}},
  setTimeout:fn=>timers.push(fn)});
 return {read:window.__health,writes,saved:()=>stored,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}}),
  tick:()=>{const fn=timers.shift();assert.ok(fn,'timer queued');fn()}};
}
function gameSnapshot(s){return JSON.stringify({home:s.home,away:s.away,reps:s.reps,hits:s.hits,
 outs:s.outs,inning:s.inning,bases:s.bases,log:s.log,gameStarted:s.gameStarted,handoff:s.handoff});}
test('a zero-rep drill can be resumed from the hub after leaving it',()=>{
 const app=boot();app.click({drill:'Zone Precision'});app.click({go:'Training'});
 assert.match(app.read().training,/RESUME Zone Precision · 0\/25/);
 app.click({go:'Drill'});
 assert.equal(app.read().state.drill,'Zone Precision');
 assert.equal(app.read().health.ok,true);
});
test('zero-rep drill resume survives refresh without modifying stored data',()=>{
 const app=boot();app.click({drill:'Quick Hands'});app.click({go:'Home'});
 const saved=app.saved(),reloaded=boot(saved);
 assert.equal(reloaded.writes.length,0);
 reloaded.click({go:'Training'});
 assert.match(reloaded.read().training,/RESUME Quick Hands · 0\/25/);
 assert.equal(reloaded.read().state.trainingReps,0);
 assert.equal(JSON.parse(reloaded.saved()).trainingReps,0);
 assert.equal(JSON.parse(reloaded.saved()).drill,'Quick Hands');
 assert.ok(reloaded.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});
test('inconsistent counters pause recording and preserve game and saved session',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 const s=app.read().state;Object.assign(s,{trainingReps:3,trainingHits:4,trainingLog:[],
  home:6,away:5,reps:10,outs:2,inning:6,bases:[true,false,true],gameStarted:true});
 const before=JSON.stringify(s.trainingLog),game=gameSnapshot(s),writes=app.writes.length;
 assert.equal(app.read().health.ok,false);
 assert.match(app.read().drill,/SESSION PAUSED — SAVED DATA PROTECTED/);
 assert.match(app.read().drill,/id="swing" disabled/);
 app.read().swing();app.click({},'swing');
 assert.equal(JSON.stringify(s.trainingLog),before);
 assert.equal(s.trainingReps,3);assert.equal(s.trainingHits,4);
 assert.equal(app.writes.length,writes);assert.equal(gameSnapshot(s),game);
});
test('a malformed log is never appended to, silently normalized or overwritten',()=>{
 const app=boot();app.click({drill:'Quick Hands'});
 const s=app.read().state;s.trainingReps=1;s.trainingHits=0;s.trainingLog=null;
 const writes=app.writes.length;
 assert.match(app.read().health.reason,/history does not match/);
 assert.doesNotThrow(()=>app.read().swing());
 assert.equal(s.trainingLog,null);assert.equal(s.trainingReps,1);
 assert.equal(app.writes.length,writes);
 app.click({go:'Training'});
 assert.match(app.read().training,/SAVED DRILL NEEDS REVIEW/);
 app.click({drill:'Barrel Control'});
 assert.equal(s.drill,'Quick Hands');
 assert.match(app.read().training,/REPLACE CURRENT DRILL/);
 assert.equal(s.trainingLog,null);
});
test('invalid individual rep details and mismatched hit totals fail closed',()=>{
 const app=boot();app.click({drill:'Barrel Control'});
 const s=app.read().state;const cases=[
  {trainingReps:1,trainingHits:0,trainingLog:[{zone:99,contact:'HARD',hit:false}]},
  {trainingReps:1,trainingHits:0,trainingLog:[{zone:5,contact:'HARD',hit:true}]},
  {trainingReps:1,trainingHits:0,trainingLog:[{zone:5,contact:'HARD'}]},
  {trainingReps:26,trainingHits:0,trainingLog:Array(26).fill({zone:5,contact:'HARD',hit:false})}
 ];
 for(const sample of cases){Object.assign(s,sample);const before=JSON.stringify(sample);
  assert.equal(app.read().health.ok,false);
  assert.equal(app.read().canRecord,false);
  assert.doesNotThrow(()=>app.read().swing());
  assert.equal(JSON.stringify({trainingReps:s.trainingReps,trainingHits:s.trainingHits,trainingLog:s.trainingLog}),before);
 }
});
test('a valid recorded repetition is still undoable after the new safety guard',()=>{
 const app=boot();app.click({drill:'Power Challenge'});const s=app.read().state;
 assert.equal(app.read().canRecord,true);
 app.read().swing();app.tick();
 assert.equal(s.trainingReps,1);assert.equal(s.trainingLog.length,1);
 assert.equal(app.read().health.ok,true);
 app.click({},'undoTrainingRep');
 assert.equal(s.trainingReps,0);assert.equal(s.trainingLog.length,0);
 assert.equal(app.read().canRecord,true);
});
test('invalid selected zone or contact cannot create an invalid training entry',()=>{
 const app=boot();app.click({drill:'Quick Hands'});const s=app.read().state;
 s.zone=10;assert.equal(app.read().canRecord,false);app.read().swing();
 assert.equal(s.trainingReps,0);
 s.zone=5;s.contact='INVALID';assert.equal(app.read().canRecord,false);app.read().swing();
 assert.equal(s.trainingLog.length,0);
 assert.match(app.read().drill,/Select a valid zone and contact strength/);
 s.contact='MEDIUM';assert.equal(app.read().canRecord,true);
});
test('invalid zero-rep saved log requires confirmation before replacing it',()=>{
 const app=boot();app.click({drill:'Zone Precision'});const s=app.read().state;
 s.trainingLog=[{zone:5,contact:'SOFT',hit:false}];
 app.click({go:'Training'});app.click({drill:'Quick Hands'});
 assert.equal(s.drill,'Zone Precision');
 assert.equal(s.trainingLog.length,1);
 assert.match(app.read().training,/REPLACE CURRENT DRILL/);
 app.click({},'cancelDrillChange');assert.equal(s.trainingLog.length,1);
 app.click({drill:'Quick Hands'});app.click({},'confirmDrillChange');
 assert.equal(s.drill,'Quick Hands');assert.equal(s.trainingLog.length,0);
 assert.equal(app.read().health.ok,true);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});

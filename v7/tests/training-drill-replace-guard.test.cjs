'use strict';
// Protect in-progress V7-only Training Academy sessions from accidental replacement.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match);
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor));
const script=match[1].replace(anchor,
 "window.__guard=()=>({state,training:training(),drill:drill(),pending:pendingDrill,swing});"+anchor);
function boot(saved=null){
 const elements={},listeners={},timers=[],writes=[];let value=saved;
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>({style:{setProperty(){}},classList:{add(){}},setAttribute(){}})};
 const window={scrollTo(){}};const random=Object.create(Math);random.random=()=>.99;
 vm.runInNewContext(script,{document,window,Math:random,
  localStorage:{getItem:()=>value,setItem:(key,next)=>{writes.push([key,next]);value=next}},
  setTimeout:fn=>timers.push(fn)});
 return {read:window.__guard,writes,saved:()=>value,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}}),
  tick:()=>{const fn=timers.shift();assert.ok(fn);fn()}};
}
const gameFields=s=>JSON.stringify({home:s.home,away:s.away,reps:s.reps,hits:s.hits,outs:s.outs,
 inning:s.inning,bases:s.bases,gameStarted:s.gameStarted,mode:s.mode});
test('replacing an unfinished drill from Training Hub requires explicit confirmation',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 app.read().swing();app.tick();app.click({go:'Training'});
 const state=app.read().state,before=JSON.stringify(state.trainingLog),writes=app.writes.length;
 app.click({drill:'Power Challenge'});
 assert.equal(state.drill,'Zone Precision');assert.equal(state.trainingReps,1);
 assert.equal(JSON.stringify(state.trainingLog),before);
 assert.equal(app.writes.length,writes,'prompt must not persist or erase data');
 assert.equal(app.read().pending,'Power Challenge');
 assert.match(app.read().training,/REPLACE CURRENT DRILL/);
 assert.match(app.read().training,/1 recorded repetitions and report/);
 assert.match(app.read().training,/KEEP CURRENT DRILL/);
 assert.match(app.read().training,/RESUME Zone Precision · 1\/25/);
});
test('cancel preserves current session and report',()=>{
 const app=boot();app.click({drill:'Barrel Control'});app.read().swing();app.tick();
 app.click({go:'Training'});app.click({drill:'Quick Hands'});
 const before=app.saved(),writes=app.writes.length;
 app.click({},'cancelDrillChange');
 assert.equal(app.read().pending,null);
 assert.equal(app.read().state.drill,'Barrel Control');
 assert.equal(app.read().state.trainingReps,1);
 assert.equal(app.saved(),before);assert.equal(app.writes.length,writes);
 assert.doesNotMatch(app.read().training(),/REPLACE CURRENT DRILL/);
});
test('confirmed replacement resets training only, leaving live game intact',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 const s=app.read().state;Object.assign(s,{home:3,away:2,reps:8,hits:5,inning:3,outs:1,
  bases:[true,false,true],gameStarted:true,mode:'Family Rivalry'});
 app.read().swing();app.tick();
 const before=gameFields(s);
 app.click({go:'Training'});app.click({drill:'Power Challenge'});
 app.click({},'confirmDrillChange');
 assert.equal(s.screen,'Drill');assert.equal(s.drill,'Power Challenge');
 assert.equal(s.trainingReps,0);assert.equal(s.trainingHits,0);assert.equal(s.trainingLog.length,0);
 assert.equal(gameFields(s),before);
 assert.equal(app.read().pending,null);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});
test('restarting same drill with recorded reps also requires confirmation',()=>{
 const app=boot();app.click({drill:'Quick Hands'});app.read().swing();app.tick();
 app.click({go:'Training'});app.click({drill:'Quick Hands'});
 assert.equal(app.read().state.trainingReps,1);
 assert.equal(app.read().pending,'Quick Hands');
 app.click({},'confirmDrillChange');
 assert.equal(app.read().state.trainingReps,0);
});
test('new drill with no recorded reps starts without a confirmation',()=>{
 const app=boot();app.click({go:'Training'});app.click({drill:'Situational Hitting'});
 assert.equal(app.read().state.screen,'Drill');
 assert.equal(app.read().state.drill,'Situational Hitting');
 assert.equal(app.read().pending,null);
});
test('pending replacement is transient and disappears after navigation or reload',()=>{
 const app=boot();app.click({drill:'Zone Precision'});app.read().swing();app.tick();
 app.click({go:'Training'});app.click({drill:'Power Challenge'});
 const before=app.saved();assert.equal(app.read().pending,'Power Challenge');
 app.click({go:'Home'});assert.equal(app.read().pending,null);
 const next=boot(before);
 assert.equal(next.read().state.drill,'Zone Precision');
 assert.equal(next.read().state.trainingReps,1);
 assert.equal(next.read().pending,null);
 next.click({go:'Training'});
 assert.match(next.read().training,/RESUME Zone Precision · 1\/25/);
 assert.doesNotMatch(next.read().training,/REPLACE CURRENT DRILL/);
});
test('stale confirmation buttons outside Training Hub cannot erase data',()=>{
 const app=boot();app.click({drill:'Zone Precision'});app.read().swing();app.tick();
 const state=app.read().state,before=app.saved(),writes=app.writes.length;
 app.click({},'confirmDrillChange');app.click({},'cancelDrillChange');
 assert.equal(state.trainingReps,1);
 assert.equal(app.saved(),before);
 assert.equal(app.writes.length,writes);
});

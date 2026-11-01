'use strict';
// Isolated V7 Training Academy acceptance checks; never accesses V6.3 storage.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 prototype script');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'test hook anchor');
const script=match[1].replace(anchor,"window.__state=()=>state;window.__swing=swing;window.__drill=drill;window.__training=training;window.__report=report;"+anchor);
function boot(saved=null){
 const elements={},listeners={},timers=[],writes=[];let value=saved;
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>({style:{setProperty(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,
  localStorage:{getItem:()=>value,setItem:(key,next)=>{writes.push([key,next]);value=next}},
  setTimeout:fn=>timers.push(fn),
  Math:Object.assign(Object.create(Math),{random:()=>.99})});
 return {state:window.__state(),swing:window.__swing,drill:window.__drill,
  training:window.__training,report:window.__report,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}}),
  tick:()=>{const fn=timers.shift();assert.ok(fn,'pending animation');fn()},
  saved:()=>value,writes};
}
test('drill nine-zone picker and contact controls appear before primary rep CTA',()=>{
 const app=boot();const screen=app.drill();
 assert.ok(screen.indexOf('data-zone="9"')<screen.indexOf('id="swing"'));
 assert.ok(screen.indexOf('data-contact="HARD"')<screen.indexOf('id="swing"'));
 assert.ok(screen.indexOf('id="swing"')<screen.indexOf('id="ballfield"'));
});
test('progressbar exposes current repetition count',()=>{
 const app=boot();app.state.trainingReps=7;
 assert.match(app.drill(),/role="progressbar"[^>]*aria-valuenow="7"/);
 assert.match(app.drill(),/width:28%/);
});
test('25th rep completes drill and blocks the 26th rep',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 for(let n=0;n<25;n++){app.swing();app.tick()}
 assert.equal(app.state.trainingReps,25);
 assert.equal(app.state.trainingLog.length,25);
 assert.match(app.drill(),/25\/25 COMPLETE · VIEW REPORT/);
 assert.doesNotMatch(app.drill(),/id="swing"/);
 app.swing();assert.equal(app.state.trainingReps,25);
});
test('double taps on the final repetition count only once',()=>{
 const app=boot();app.click({drill:'Quick Hands'});
 app.state.trainingReps=24;app.state.trainingLog=Array.from({length:24},()=>({zone:5,hit:false}));
 app.swing();app.swing();
 assert.equal(app.state.trainingReps,25);
 app.tick();app.swing();
 assert.equal(app.state.trainingLog.length,25);
});
test('training hub resumes unfinished drill without resetting stats',()=>{
 const app=boot();app.click({drill:'Barrel Control'});app.swing();app.tick();
 app.click({go:'Training'});
 assert.match(app.training(),/RESUME Barrel Control · 1\/25/);
 app.click({go:'Drill'});
 assert.equal(app.state.trainingReps,1);
});
test('completed drill report is reachable from hub after reload',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 app.state.trainingReps=25;app.state.trainingHits=10;app.state.trainingLog=[{zone:5,hit:true}];
 app.click({go:'Training'});
 const next=boot(app.saved());
 assert.match(next.training(),/VIEW LAST DRILL REPORT/);
 assert.doesNotMatch(next.training(),/RESUME Zone Precision/);
 assert.match(next.report(),/25 repetitions · 10 hits/);
});
test('training cap never changes active game counters or baserunners',()=>{
 const app=boot();app.click({go:'Game'});app.state.home=3;app.state.away=2;
 app.state.reps=8;app.state.hits=5;app.state.inning=2;app.state.bases=[true,false,true];
 app.click({drill:'Zone Precision'});
 for(let n=0;n<25;n++){app.swing();app.tick()}
 assert.equal(app.state.reps,8);assert.equal(app.state.hits,5);
 assert.equal(app.state.home,3);assert.equal(app.state.away,2);
 assert.equal(app.state.inning,2);
 assert.deepEqual(Array.from(app.state.bases),[true,false,true]);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});
test('new drill resets the completed session but not game data',()=>{
 const app=boot();app.click({drill:'Zone Precision'});app.state.trainingReps=25;
 app.state.trainingHits=12;app.state.reps=4;app.click({drill:'Power Challenge'});
 assert.equal(app.state.trainingReps,0);assert.equal(app.state.trainingHits,0);
 assert.equal(app.state.drill,'Power Challenge');assert.equal(app.state.reps,4);
 assert.match(app.drill(),/id="swing"/);
});

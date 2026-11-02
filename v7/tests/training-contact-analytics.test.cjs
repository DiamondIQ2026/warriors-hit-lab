'use strict';
// Isolated V7 experimental Training Academy regression checks.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const start=html.indexOf('<script>'),end=html.indexOf('</script>',start);
assert.ok(start>=0&&end>start,'V7 script present');
const anchor="el('menuButton').onclick=";
const original=html.slice(start+8,end);
assert.ok(original.includes(anchor),'test hook exists');
const script=original.replace(anchor,"window.__analytics=()=>({state,summary:trainingSummary(),goal:drillGoal(),report:report(),drill:drill()});window.__swing=swing;"+anchor);
function boot(saved=null){
 const elements={},listeners={},timers=[],writes=[];let value=saved;
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(name,fn)=>listeners[name]=fn,
  createElement:()=>({style:{setProperty(){}},classList:{add(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 const random=Object.create(Math);random.random=()=>.99;
 vm.runInNewContext(script,{document,window,Math:random,
  localStorage:{getItem:()=>value,setItem:(key,next)=>{writes.push([key,next]);value=next}},
  setTimeout:fn=>timers.push(fn)});
 return {read:window.__analytics,swing:window.__swing,writes,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}}),
  tick:()=>{const timer=timers.shift();assert.ok(timer);timer()},
  saved:()=>value};
}
const valid=[
 {zone:1,contact:'SOFT',hit:true},{zone:1,contact:'SOFT',hit:false},
 {zone:1,contact:'SOFT',hit:true},{zone:5,contact:'MEDIUM',hit:true},
 {zone:5,contact:'MEDIUM',hit:false},{zone:5,contact:'MEDIUM',hit:false},
 {zone:5,contact:'MEDIUM',hit:false},{zone:9,contact:'HARD',hit:true}
];
test('contact-strength panel shows rates only for adequate samples',()=>{
 const app=boot();app.read().state.trainingLog=valid;
 const report=app.read().report;
 assert.ok(report.includes('Contact Strength Breakdown'));
 assert.ok(report.includes('SOFT<br><b>67%</b><br><small>2/3 simulated hits'));
 assert.ok(report.includes('MEDIUM<br><b>25%</b><br><small>1/4 simulated hits'));
 assert.ok(report.includes('HARD<br><b>—</b><br><small>1/1 simulated hits · SMALL SAMPLE'));
 assert.ok(report.includes('not measured bat speed'));
 assert.equal(app.writes.length,0);
});
test('malformed entries do not inflate goals or analytics',()=>{
 const app=boot();const state=app.read().state;state.drill='Zone Precision';
 state.trainingLog=[...valid,null,{},'junk',
  {zone:0,contact:'SOFT',hit:true},{zone:10,contact:'HARD',hit:true},
  {zone:'3',contact:'SOFT',hit:true},{zone:3,contact:'INVALID',hit:true},
  {zone:3,contact:'SOFT',hit:'yes'}];
 const {summary,goal}=app.read();
 assert.equal(summary.zones.reduce((n,z)=>n+z.reps,0),8);
 assert.equal(summary.zones.reduce((n,z)=>n+z.hits,0),4);
 assert.equal(summary.contacts.SOFT,3);assert.equal(summary.contacts.MEDIUM,4);
 assert.equal(summary.contacts.HARD,1);assert.equal(goal.current,3);
 assert.equal(app.writes.length,0);
});
test('missing and non-array logs produce safe zero-sample reports',()=>{
 const app=boot();const state=app.read().state;
 for(const bad of [null,'bad',{},[null,{}]]){
  state.trainingLog=bad;const {summary,report}=app.read();
  assert.equal(summary.contacts.HARD,0);assert.equal(summary.contactHits.SOFT,0);
  assert.ok(!report.includes('NaN')&&!report.includes('Infinity'));
  assert.ok(report.includes('SOFT<br><b>—</b>'));
 }
 assert.equal(app.writes.length,0);
});
test('focus recommendation requires two zones with three valid reps each',()=>{
 const app=boot();const state=app.read().state;
 state.trainingLog=valid.slice(0,3);assert.equal(app.read().summary.focus,null);
 state.trainingLog=valid;assert.equal(app.read().summary.focus,5);
 assert.ok(app.read().report.includes('Review Zone 5'));
});
test('analytics are read-only and preserve live game progress',()=>{
 const app=boot();const state=app.read().state;
 Object.assign(state,{away:2,home:4,inning:3,outs:2,reps:12,hits:8,bases:[true,false,true],trainingLog:valid});
 const before=JSON.stringify({away:state.away,home:state.home,inning:state.inning,outs:state.outs,reps:state.reps,hits:state.hits,bases:state.bases});
 app.read().report;app.read().summary;app.read().goal;
 const after=JSON.stringify({away:state.away,home:state.home,inning:state.inning,outs:state.outs,reps:state.reps,hits:state.hits,bases:state.bases});
 assert.equal(after,before);assert.equal(app.writes.length,0);
});
test('real simulated training rep updates breakdown without game stats',()=>{
 const app=boot();app.click({drill:'Power Challenge'});
 const state=app.read().state;state.home=3;state.reps=7;state.hits=4;
 app.click({contact:'HARD'});app.swing();
 assert.equal(state.trainingReps,1);assert.equal(state.reps,7);
 assert.equal(state.hits,4);assert.equal(state.home,3);
 assert.equal(app.read().summary.contacts.HARD,1);assert.equal(app.read().goal.current,1);
 app.tick();assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});
test('training breakdown persists through V7-only save reload',()=>{
 const app=boot();app.click({drill:'Zone Precision'});
 const state=app.read().state;state.trainingLog=valid;state.trainingReps=8;state.trainingHits=4;
 app.click({go:'Training'});const reloaded=boot(app.saved());
 assert.equal(reloaded.read().summary.contacts.MEDIUM,4);
 assert.equal(reloaded.read().summary.contactHits.SOFT,2);
 assert.ok(reloaded.read().report.includes('Contact Strength Breakdown'));
 assert.equal(reloaded.writes.length,0);
});

'use strict';
// Experimental V7-only: never infer a performance report from inconsistent saved data.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 inline script');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'test hook anchor');
const script=match[1].replace(anchor,
 "window.__integrity=()=>({state,report:report(),drill:drill(),hub:training(),health:trainingSessionHealth()});"+anchor);
function boot(saved=null){
 const elements={},listeners={},writes=[];let v7=saved;
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>({style:{setProperty(){}},classList:{add(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,
  localStorage:{getItem:key=>key==='hitlab-v7-visual-prototype-only'?v7:'v6.3-sentinel',
   setItem:(key,value)=>{writes.push([key,value]);if(key==='hitlab-v7-visual-prototype-only')v7=value}},
  setTimeout(){},Math:Object.assign(Object.create(Math),{random:()=>.99})});
 return {read:window.__integrity,writes,saved:()=>v7,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}})};
}
const valid=()=>Array.from({length:8},(_,i)=>({zone:i%2?5:1,contact:i%2?'HARD':'SOFT',hit:i<4}));
function seed(app){
 const s=app.read().state;
 Object.assign(s,{drill:'Zone Precision',trainingReps:8,trainingHits:4,trainingLog:valid()});
 return s;
}
const game=s=>JSON.stringify({home:s.home,away:s.away,inning:s.inning,outs:s.outs,
 reps:s.reps,hits:s.hits,bases:s.bases,gameStarted:s.gameStarted,handoff:s.handoff});
test('consistent session still displays verified breakdown and focus progress',()=>{
 const app=boot();seed(app);const r=app.read();
 assert.equal(r.health.ok,true);
 assert.match(r.report,/Contact Strength Breakdown/);
 assert.match(r.report,/8 repetitions · 4 hits/);
 assert.doesNotMatch(r.report,/REPORT PAUSED/);
 assert.equal(app.writes.length,0);
});
test('counter mismatch pauses report without publishing inferred performance',()=>{
 const app=boot();const s=seed(app);s.trainingHits=7;
 const r=app.read();
 assert.equal(r.health.ok,false);
 assert.match(r.report,/REPORT PAUSED — SAVED DATA PROTECTED/);
 assert.doesNotMatch(r.report,/Zone Performance|Contact Strength Breakdown|DRILL FOCUS|8 repetitions · 7 hits/);
 assert.match(r.report,/original saved repetitions have not been repaired/);
 assert.equal(app.writes.length,0);
});
test('missing log, extra log entries and invalid entry details all quarantine report',()=>{
 const app=boot();const s=seed(app);
 for(const log of [null,[...valid(),valid()[0]],valid().map((x,i)=>i===3?{...x,zone:15}:x)]){
  s.trainingLog=log;
  const before=JSON.stringify(s.trainingLog);
  assert.equal(app.read().health.ok,false);
  assert.match(app.read().report,/REPORT PAUSED/);
  assert.doesNotMatch(app.read().report,/Contact Strength Breakdown/);
  assert.equal(JSON.stringify(s.trainingLog),before);
 }
 assert.equal(app.writes.length,0);
});
test('corrupt completed 25-rep drill cannot claim completion or coaching results',()=>{
 const app=boot();const s=seed(app);
 s.screen='Drill';s.trainingReps=25;s.trainingHits=4;
 const r=app.read();
 assert.equal(r.health.ok,false);
 assert.match(r.drill,/SESSION PAUSED — SAVED DATA PROTECTED/);
 assert.doesNotMatch(r.drill,/25\/25 COMPLETE · VIEW REPORT|class="panel drill-goal"/);
 assert.match(r.drill,/Saved session paused/);
 assert.match(r.report,/REPORT PAUSED/);
});
test('corrupt zero-rep session still exposes a review route from the hub',()=>{
 const app=boot();const s=app.read().state;
 Object.assign(s,{drill:'Quick Hands',trainingReps:0,trainingHits:0,
  trainingLog:[{zone:1,contact:'SOFT',hit:false}]});
 const hub=app.read().hub;
 assert.match(hub,/SAVED DRILL NEEDS REVIEW/);
 assert.match(hub,/REVIEW SAVED SESSION/);
 assert.doesNotMatch(hub,/RESUME Quick Hands/);
 app.click({go:'Training Results'});
 assert.match(app.read().report,/REPORT PAUSED/);
});
test('report inspection is read-only and never alters a live Family Rivalry game',()=>{
 const app=boot();const s=seed(app);
 Object.assign(s,{mode:'Family Rivalry',home:6,away:5,inning:4,outs:2,
  reps:12,hits:7,bases:[true,false,true],gameStarted:true,handoff:true});
 s.trainingLog=null;
 const before=game(s),training=JSON.stringify({trainingReps:s.trainingReps,trainingHits:s.trainingHits,trainingLog:s.trainingLog});
 app.read().report;app.read().drill;app.read().hub;
 assert.equal(game(s),before);
 assert.equal(JSON.stringify({trainingReps:s.trainingReps,trainingHits:s.trainingHits,trainingLog:s.trainingLog}),training);
 assert.equal(app.writes.length,0);
});
test('invalid saved fields are escaped rather than inserted as markup',()=>{
 const app=boot();const s=seed(app);
 s.screen='Drill';s.trainingHits='<img src=x onerror=alert(1)>';
 s.zone='<svg onload=alert(1)>';s.contact='<b>bad</b>';
 const markup=app.read().drill;
 assert.match(markup,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(markup,/&lt;svg onload=alert\(1\)&gt;/);
 assert.match(markup,/&lt;b&gt;bad&lt;\/b&gt;/);
 assert.doesNotMatch(markup,/<img src=x|<svg onload=alert|<b>bad<\/b>/);
 assert.match(app.read().report,/REPORT PAUSED/);
});
test('replacement requires confirmation and preserves game and V6.3 storage',()=>{
 const app=boot();const s=seed(app);
 Object.assign(s,{home:4,away:3,inning:3,outs:1,reps:10,bases:[true,false,true]});
 s.trainingLog=null;
 app.click({go:'Training'});const before=game(s);
 app.click({drill:'Barrel Control'});
 assert.equal(s.drill,'Zone Precision');
 assert.match(app.read().hub,/REPLACE CURRENT DRILL/);
 app.click({},'cancelDrillChange');assert.equal(s.drill,'Zone Precision');
 app.click({drill:'Barrel Control'});app.click({},'confirmDrillChange');
 assert.equal(s.drill,'Barrel Control');
 assert.equal(app.read().health.ok,true);
 assert.equal(s.trainingReps,0);assert.equal(s.trainingHits,0);
 assert.equal(game(s),before);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
 const reloaded=boot(app.saved());
 assert.equal(reloaded.writes.length,0);
 assert.equal(reloaded.read().health.ok,true);
 assert.doesNotMatch(reloaded.read().report,/REPORT PAUSED/);
});

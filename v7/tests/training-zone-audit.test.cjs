'use strict';
// Experimental V7-only training audit: read-only, sample-aware, save-isolated.
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
 "window.__audit=()=>({state,report:report(),drill:drill(),health:trainingSessionHealth(),history:trainingRepHistory(25),summary:trainingSummary()});"+anchor);
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
 return {read:window.__audit,writes,saved:()=>v7,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}})};
}
const makeLog=(n,zoneFn=i=>i%9+1)=>Array.from({length:n},(_,i)=>({
 zone:zoneFn(i),contact:['SOFT','MEDIUM','HARD'][i%3],hit:i%2===0
}));
function seed(app,n=8,zoneFn){
 const s=app.read().state;
 Object.assign(s,{screen:'Drill',drill:'Zone Precision',trainingReps:n,
  trainingHits:Math.ceil(n/2),trainingLog:makeLog(n,zoneFn)});
 return s;
}
const game=s=>JSON.stringify({mode:s.mode,home:s.home,away:s.away,inning:s.inning,
 outs:s.outs,reps:s.reps,hits:s.hits,bases:s.bases,gameStarted:s.gameStarted,handoff:s.handoff});
test('nine-zone coverage counts actual recorded selections, not hit placements',()=>{
 const app=boot();seed(app,8);
 const report=app.read().report;
 assert.match(report,/3×3 Zone Coverage/);
 assert.match(report,/8\/9 zones visited · 0 zones with 3\+ repetitions/);
 assert.match(report,/role="group" aria-label="Nine-zone training coverage"/);
 assert.match(report,/Zone 1: 1 repetitions, 1 simulated hits/);
 assert.match(report,/Zone 9: 0 repetitions, 0 simulated hits/);
 assert.equal(app.writes.length,0);
});
test('zone rate display suppresses one- and two-repetition samples',()=>{
 const app=boot();seed(app,5,i=>i<3?5:2);
 const report=app.read().report;
 assert.match(report,/ZONE 5<br><b>67%/);
 assert.match(report,/ZONE 2<br><b>—/);
 assert.match(report,/3 repetitions; smaller samples/);
 assert.match(report,/2\/9 zones visited · 1 zones with 3\+ repetitions/);
});
test('full report includes newest-first auditable entries with real sequence numbers',()=>{
 const app=boot();seed(app,8);
 const report=app.read().report;
 assert.match(report,/Rep-by-Rep Log · 8 recorded/);
 assert.ok(report.indexOf('Rep 8 · Zone 8')<report.indexOf('Rep 1 · Zone 1'));
 assert.match(report,/<ol class="training-rep-list" reversed start="8">/);
 assert.match(report,/SIMULATED HIT/);
 assert.match(report,/SIMULATED OUT/);
});
test('drill limits the recent history to five entries, below the record controls',()=>{
 const app=boot();seed(app,8);
 const drill=app.read().drill;
 assert.match(drill,/RECORD REP ▶/);
 assert.match(drill,/Rep-by-Rep Log · 8 recorded/);
 assert.doesNotMatch(drill,/Rep 1 · Zone 1/);
 assert.match(drill,/Rep 4 · Zone 4/);
 assert.ok(drill.indexOf('RECORD REP ▶')<drill.indexOf('Rep-by-Rep Log'));
});
test('empty session shows truthful audit and does not fabricate a hit rate',()=>{
 const app=boot();const s=app.read().state;
 Object.assign(s,{screen:'Drill',drill:'Quick Hands'});
 assert.match(app.read().history,/No repetitions recorded yet/);
 assert.match(app.read().report,/0\/9 zones visited/);
 assert.match(app.read().report,/ZONE 1<br><b>—/);
 assert.doesNotMatch(app.read().report,/NaN%|Infinity%/);
});
test('undo updates read-only rep history and zone coverage without touching game',()=>{
 const app=boot();const s=seed(app,8);
 Object.assign(s,{mode:'Family Rivalry',home:4,away:3,inning:5,outs:2,
  reps:11,hits:6,bases:[true,false,true],gameStarted:true,handoff:true});
 const before=game(s);
 app.click({},'undoTrainingRep');
 assert.equal(s.trainingReps,7);
 assert.equal(s.trainingHits,4);
 assert.equal(game(s),before);
 assert.match(app.read().report,/Rep-by-Rep Log · 7 recorded/);
 assert.doesNotMatch(app.read().report,/Rep 8 · Zone 8/);
 assert.match(app.read().report,/7\/9 zones visited/);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});
test('saved valid session restores the same history after reload',()=>{
 const app=boot();seed(app,8);
 app.click({go:'Training Results'});
 const before=app.read().history;
 const reloaded=boot(app.saved());
 assert.equal(reloaded.read().history,before);
 assert.equal(reloaded.writes.length,0);
});
test('corrupt log quarantines both audit panels without inferring partial results',()=>{
 const app=boot();const s=seed(app,8);
 s.trainingLog[2].contact='<img onerror=alert(1)>';
 const report=app.read().report,drill=app.read().drill;
 assert.equal(app.read().health.ok,false);
 assert.match(report,/REPORT PAUSED/);
 assert.doesNotMatch(report,/3×3 Zone Coverage|Rep-by-Rep Log|Contact Strength Breakdown/);
 assert.doesNotMatch(drill,/Rep-by-Rep Log/);
 assert.doesNotMatch(report,/<img/);
 assert.equal(app.writes.length,0);
});
test('25-rep log is bounded and shows no fabricated extra repetition',()=>{
 const app=boot();seed(app,25);
 const report=app.read().report;
 assert.match(report,/Rep-by-Rep Log · 25 recorded/);
 assert.match(report,/Rep 25 · Zone 7/);
 assert.doesNotMatch(report,/Rep 26 ·/);
 assert.match(report,/25 repetitions · 13 hits/);
});
test('report reading never writes V7 or V6.3 state or changes live rivalry',()=>{
 const app=boot();const s=seed(app,9);
 Object.assign(s,{mode:'Family Rivalry',home:7,away:6,inning:6,outs:1,
  reps:18,hits:9,bases:[true,true,false],gameStarted:true,handoff:true});
 const before=game(s),training=JSON.stringify(s.trainingLog);
 app.read().report;app.read().history;app.read().drill;
 assert.equal(game(s),before);
 assert.equal(JSON.stringify(s.trainingLog),training);
 assert.equal(app.writes.length,0);
});

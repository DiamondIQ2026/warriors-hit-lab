'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'Prototype script exists');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'Test hook anchor exists');
const script=match[1].replace(anchor,"window.__state=()=>state;window.__complete=completeInning;window.__cpu=simulateOpponentHalf;window.__finish=finishGame;window.__begin=beginGame;window.__prob=hitProbability;window.__distance=hitDistance;window.__parkHit=parkAdjustedHit;window.__fence=fenceDistance;window.__swing=swing;"+anchor);
function setup(random=()=>0.99){
 const elements={};const listeners={};
 const el=id=>elements[id]??(elements[id]={innerHTML:'',textContent:'',disabled:false,classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},appendChild(){}});
 const document={getElementById:el,addEventListener:(name,cb)=>listeners[name]=cb,createElement:()=>({style:{setProperty(){}}})};
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},Math:Object.assign(Object.create(Math),{random})});
 return {state:window.__state(),complete:window.__complete,cpu:window.__cpu,finish:window.__finish,begin:window.__begin,prob:window.__prob,distance:window.__distance,parkHit:window.__parkHit,fence:window.__fence,swing:window.__swing};
}
test('CPU cannot score more than five runs in one half inning',()=>{
 const app=setup(()=>0);
 app.state.difficulty='All-Star';app.state.inning=2;app.state.away=0;
 const runs=app.cpu();
 assert.ok(runs>=0&&runs<=5);
 assert.equal(app.state.away,runs);
});
test('CPU shutout leaves away score unchanged',()=>{
 const app=setup(()=>0.99);
 app.state.away=3;app.state.inning=2;
 assert.equal(app.cpu(),0);
 assert.equal(app.state.away,3);
});
test('tied final inning triggers extra innings in CPU mode',()=>{
 const app=setup(()=>0.99);
 Object.assign(app.state,{mode:'Season',inning:3,innings:3,home:2,away:2,outs:3});
 app.complete();
 assert.equal(app.state.inning,4);
 assert.equal(app.state.extraInnings,1);
 assert.equal(app.state.gameFinished,false);
});
test('decided final inning ends game in CPU mode',()=>{
 const app=setup(()=>0.99);
 Object.assign(app.state,{mode:'Season',inning:3,innings:3,home:4,away:2,outs:3});
 app.complete();
 assert.equal(app.state.gameFinished,true);
});
test('family rivalry switches from away to home after top half',()=>{
 const app=setup();
 Object.assign(app.state,{mode:'Family Rivalry',rivalryTurn:'away',inning:1,innings:3,outs:3});
 app.complete();
 assert.equal(app.state.rivalryTurn,'home');
 assert.equal(app.state.inning,1);
 assert.equal(app.state.handoff,true);
 assert.equal(app.state.outs,0);
});
test('family rivalry ends after final top when home already leads',()=>{
 const app=setup();
 Object.assign(app.state,{mode:'Family Rivalry',rivalryTurn:'away',inning:3,innings:3,home:4,away:2,outs:3});
 app.complete();
 assert.equal(app.state.gameFinished,true);
});
test('family rivalry tied after bottom final enters extras',()=>{
 const app=setup();
 Object.assign(app.state,{mode:'Family Rivalry',rivalryTurn:'home',inning:3,innings:3,home:2,away:2,outs:3});
 app.complete();
 assert.equal(app.state.extraInnings,1);
 assert.equal(app.state.inning,4);
 assert.equal(app.state.rivalryTurn,'away');
 assert.equal(app.state.gameFinished,false);
});
test('starting a new game resets score, bases, outs and extras',()=>{
 const app=setup();
 Object.assign(app.state,{mode:'Season',home:9,away:7,inning:5,outs:2,extraInnings:2,gameFinished:true,bases:[true,true,true]});
 app.begin();
 assert.equal(app.state.home,0);
 assert.equal(app.state.away,0);
 assert.equal(app.state.inning,1);
 assert.equal(app.state.outs,0);
 assert.equal(app.state.extraInnings,0);
 assert.deepEqual(Array.from(app.state.bases),[false,false,false]);
 assert.equal(app.state.gameFinished,false);
});

test('hard contact improves hit probability over soft contact',()=>{
 const app=setup();
 assert.ok(app.prob('HARD',5,'Veteran')>app.prob('SOFT',5,'Veteran'));
});
test('middle-middle zone improves probability over corner',()=>{
 const app=setup();
 assert.ok(app.prob('MEDIUM',5,'Veteran')>app.prob('MEDIUM',1,'Veteran'));
});
test('difficulty reduces chance of a hit',()=>{
 const app=setup();
 assert.ok(app.prob('MEDIUM',5,'Rookie')>app.prob('MEDIUM',5,'All-Star'));
});
test('hit probability remains between zero and one',()=>{
 const app=setup();
 for(const c of ['SOFT','MEDIUM','HARD'])for(const z of [1,5,9])for(const d of ['Rookie','Veteran','All-Star']){
  const p=app.prob(c,z,d);
  assert.ok(p>0&&p<1);
 }
});
test('hit distance maps to single through home run',()=>{
 const app=setup();
 for(const c of ['SOFT','MEDIUM','HARD']){
  for(const roll of [0,.02,.1,.5,.99]){
   const bases=app.distance(c,roll);
   assert.ok(Number.isInteger(bases)&&bases>=1&&bases<=4);
  }
 }
});
test('hard contact can produce a home run',()=>{
 const app=setup();
 assert.equal(app.distance('HARD',0),4);
});
test('soft contact can produce a single',()=>{
 const app=setup();
 assert.equal(app.distance('SOFT',.99),1);
});

test('family rivalry walk-off ends game when home takes final-inning lead',()=>{
 const app=setup(()=>0);
 Object.assign(app.state,{screen:'Game',mode:'Family Rivalry',rivalryTurn:'home',inning:3,innings:3,home:3,away:3,contact:'HARD',zone:5,handoff:false,gameFinished:false});
 app.swing();
 assert.equal(app.state.gameFinished,true);
 assert.ok(app.state.finalReason.includes('Walk-off'));
 assert.equal(app.state.home,4);
});
test('family rivalry cannot walk off before regulation final inning',()=>{
 const app=setup(()=>0);
 Object.assign(app.state,{screen:'Game',mode:'Family Rivalry',rivalryTurn:'home',inning:2,innings:3,home:2,away:3,contact:'HARD',zone:5,handoff:false,gameFinished:false});
 app.swing();
 assert.equal(app.state.gameFinished,false);
 assert.equal(app.state.home,3);
});
test('finished game rejects further swings',()=>{
 const app=setup(()=>0);
 Object.assign(app.state,{screen:'Game',mode:'Family Rivalry',rivalryTurn:'home',gameFinished:true,reps:7});
 app.swing();
 assert.equal(app.state.reps,7);
});
test('handoff prevents swing before next family player is ready',()=>{
 const app=setup(()=>0);
 Object.assign(app.state,{screen:'Game',mode:'Family Rivalry',rivalryTurn:'home',handoff:true,reps:4});
 app.swing();
 assert.equal(app.state.reps,4);
});

test('Tropicana Field uses different left, center, and right fence distances',()=>{
 const app=setup();
 assert.equal(app.fence(4),315);
 assert.equal(app.fence(5),404);
 assert.equal(app.fence(6),322);
});
test('stadium-aware flight converts a short center-field home run into a double',()=>{
 const app=setup();
 const center=app.parkHit('MEDIUM',5,4);
 assert.equal(center.fence,404);
 assert.equal(center.bases,2);
 assert.equal(center.cleared,false);
 const left=app.parkHit('HARD',4,4);
 assert.equal(left.fence,315);
 assert.equal(left.bases,4);
 assert.equal(left.cleared,true);
});

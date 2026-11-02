'use strict';
// V7-only stale-input and invalid-save regressions. Legacy production is never written.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'experimental V7 inline script');
const anchor="el('menuButton').onclick=";
assert.ok(source.includes(anchor),'V7 test hook');
const script=source.replace(anchor,
 "window.__guard=()=>({state,health:gameSessionHealth(),game:game()});window.__swing=swing;"+anchor);
const KEY='hitlab-v7-visual-prototype-only';
const LEGACY='hitlab-v6.3-production';

function savedGame(overrides={}){
 return {mode:'Family Rivalry',gameStarted:true,gameFinished:false,
  inning:2,innings:3,outs:1,home:2,away:1,reps:7,hits:4,
  bases:[true,false,true],log:['SINGLE!'],handoff:true,rivalryTurn:'away',
  rivalryStats:{away:{reps:4,hits:2},home:{reps:3,hits:2}},
  trainingReps:2,trainingHits:1,trainingLog:[
   {zone:5,contact:'HARD',hit:true},{zone:3,contact:'SOFT',hit:false}
  ],...overrides};
}
function boot(saved=savedGame()){
 const elements={},listeners={},writes=[],storage={
  [KEY]:JSON.stringify(saved),[LEGACY]:'v6.3-unchanged'
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
function gameplay(s){
 return JSON.stringify({inning:s.inning,outs:s.outs,home:s.home,away:s.away,
  reps:s.reps,hits:s.hits,bases:s.bases,log:s.log,handoff:s.handoff,
  rivalryTurn:s.rivalryTurn,rivalryStats:s.rivalryStats,
  gameStarted:s.gameStarted,gameFinished:s.gameFinished,
  trainingReps:s.trainingReps,trainingHits:s.trainingHits,trainingLog:s.trainingLog});
}
function unchangedLegacy(app){
 assert.equal(app.storage[LEGACY],'v6.3-unchanged');
 assert.ok(app.writes.every(([key])=>key===KEY));
}

for(const screen of ['Home','Play','Training','Results']){
 test('stale game swing outside live Game is inert on '+screen,()=>{
  const app=boot(savedGame({handoff:false})),s=app.read().state;
  if(screen!=='Home')app.click({go:screen});
  const before=gameplay(s),writes=app.writes.length;
  app.swing();
  app.click({},'swing');
  assert.equal(gameplay(s),before);
  assert.equal(app.writes.length,writes);
  assert.equal(s.animating,false);
  unchangedLegacy(app);
 });
}
test('stale handoff acknowledgement outside Game cannot unlock Family Rivalry',()=>{
 const app=boot(),s=app.read().state;
 const before=gameplay(s),writes=app.writes.length;
 app.click({},'readyBatter');
 assert.equal(gameplay(s),before);
 assert.equal(app.writes.length,writes);
 assert.equal(s.handoff,true);
 unchangedLegacy(app);
});
for(const [label,patch,reason] of [
 ['zero zone',{zone:0},/batting zone or contact/],
 ['zone ten',{zone:10},/batting zone or contact/],
 ['fractional zone',{zone:2.5},/batting zone or contact/],
 ['string zone',{zone:'5'},/batting zone or contact/],
 ['invalid contact',{contact:'MAX'},/batting zone or contact/],
 ['missing contact',{contact:null},/batting zone or contact/],
 ['unsupported difficulty',{difficulty:'Expert'},/difficulty/],
 ['active and finished',{gameStarted:true,gameFinished:true},/both active and finished/],
 ['Exhibition handoff',{mode:'Exhibition',handoff:true},/outside Family Rivalry/]
]){
 test('invalid V7 save quarantined without mutation: '+label,()=>{
  const app=boot(savedGame(patch)),s=app.read().state;
  const before=gameplay(s),stored=app.storage[KEY];
  assert.equal(app.read().health.ok,false);
  assert.match(app.read().health.reason,reason);
  assert.equal(app.writes.length,0);
  if(!s.gameFinished){
   app.click({},'resumeGame');
   assert.match(app.read().game,/GAMEPLAY PAUSED/);
   const afterNavigation=app.writes.length;
   app.swing();
   app.click({},'readyBatter');
   app.click({zone:'5'});
   app.click({contact:'HARD'});
   assert.equal(app.writes.length,afterNavigation);
  }
  assert.equal(gameplay(s),before);
  if(s.screen==='Home')assert.equal(app.storage[KEY],stored);
  unchangedLegacy(app);
 });
}
test('malformed zone input is rejected without rewriting a healthy live game',()=>{
 const app=boot(savedGame({handoff:false})),s=app.read().state;
 app.click({},'resumeGame');
 const before=gameplay(s),writes=app.writes.length;
 for(const zone of ['0','10','1.5','abc','Infinity','-1'])app.click({zone});
 assert.equal(gameplay(s),before);
 assert.equal(s.zone,5);
 assert.equal(app.writes.length,writes);
 unchangedLegacy(app);
});
test('malformed contact input is rejected without rewriting a healthy live game',()=>{
 const app=boot(savedGame({handoff:false})),s=app.read().state;
 app.click({},'resumeGame');
 const before=gameplay(s),writes=app.writes.length;
 for(const contact of ['POWER','', 'medium','HARD '])if(contact)app.click({contact});
 assert.equal(gameplay(s),before);
 assert.equal(s.contact,'MEDIUM');
 assert.equal(app.writes.length,writes);
 unchangedLegacy(app);
});
test('stale zone and contact events outside Game and Drill do not change selections',()=>{
 const app=boot(),s=app.read().state;
 const writes=app.writes.length;
 app.click({zone:'9'});app.click({contact:'HARD'});
 assert.equal(s.zone,5);assert.equal(s.contact,'MEDIUM');
 assert.equal(app.writes.length,writes);
 unchangedLegacy(app);
});
test('valid nine-zone and contact selections work in active gameplay without changing scores',()=>{
 const app=boot(savedGame({handoff:false})),s=app.read().state;
 app.click({},'resumeGame');
 const before=gameplay(s),writes=app.writes.length;
 app.click({zone:'9'});app.click({contact:'HARD'});
 assert.equal(s.zone,9);assert.equal(s.contact,'HARD');
 assert.equal(gameplay(s),before);
 assert.equal(app.writes.length,writes+2);
 assert.equal(app.read().health.ok,true);
 unchangedLegacy(app);
});
test('valid Training Academy selections remain available and isolate active-game statistics',()=>{
 const app=boot(),s=app.read().state;
 s.screen='Drill';s.drill='Zone Precision';
 const before=gameplay(s);
 app.click({zone:'1'});app.click({contact:'SOFT'});
 assert.equal(s.zone,1);assert.equal(s.contact,'SOFT');
 assert.equal(gameplay(s),before);
 unchangedLegacy(app);
});
test('healthy Family Rivalry handoff still unlocks a valid swing',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 assert.match(app.read().game,/PASS THE PHONE/);
 app.click({},'readyBatter');
 assert.equal(s.handoff,false);
 const reps=s.reps;
 app.swing();
 assert.equal(s.reps,reps+1);
 assert.equal(s.outs,2);
 unchangedLegacy(app);
});

test('hidden zone and contact controls cannot change a pass-the-phone handoff',()=>{
 const app=boot(),s=app.read().state;
 app.click({},'resumeGame');
 assert.match(app.read().game,/PASS THE PHONE/);
 const before=gameplay(s),writes=app.writes.length;
 app.click({zone:'9'});app.click({contact:'HARD'});
 assert.equal(s.zone,5);assert.equal(s.contact,'MEDIUM');
 assert.equal(gameplay(s),before);
 assert.equal(app.writes.length,writes);
 app.click({},'readyBatter');
 app.click({zone:'9'});
 assert.equal(s.zone,9,'zone selection becomes available after handoff');
 unchangedLegacy(app);
});
test('hidden batting controls cannot mutate an open End Game confirmation',()=>{
 const app=boot(savedGame({handoff:false})),s=app.read().state;
 app.click({},'resumeGame');
 app.click({},'endGame');
 assert.match(app.read().game,/END THIS GAME EARLY/);
 const before=gameplay(s),writes=app.writes.length;
 app.click({zone:'1'});app.click({contact:'HARD'});
 assert.equal(s.zone,5);assert.equal(s.contact,'MEDIUM');
 assert.equal(gameplay(s),before);
 assert.equal(app.writes.length,writes);
 app.click({},'cancelEndGame');
 app.click({contact:'HARD'});
 assert.equal(s.contact,'HARD','controls work again after cancellation');
 unchangedLegacy(app);
});

'use strict';
// V7-only baseball scoring and inning-handoff regression. No production or V6.3 writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'V7 experimental inline script exists');
const anchor="el('menuButton').onclick=";
assert.ok(source.includes(anchor),'stable V7 hook exists');
const script=source.replace(anchor,
 "window.__state=()=>state;window.__swing=swing;window.__credit=walkoffRunCredit;window.__results=results;"+anchor);
const KEY='hitlab-v7-visual-prototype-only';
const LEGACY='hitlab-v6.3-production';

function boot(rolls=[0,.1],saved=null){
 const elements={},listeners={},writes=[],timers=[];
 const storage={[LEGACY]:'v6.3-sentinel-unchanged'};
 if(saved)storage[KEY]=JSON.stringify(saved);
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={
  getElementById:el,addEventListener:(type,handler)=>listeners[type]=handler,
  createElement:()=>({style:{setProperty(){}},setAttribute(){}})
 };
 const window={scrollTo(){}};
 const random=Object.create(Math);
 random.random=()=>rolls.length?rolls.shift():.99;
 vm.runInNewContext(script,{document,window,Math:random,
  localStorage:{getItem:key=>storage[key]??null,
   setItem:(key,value)=>{writes.push([key,value]);storage[key]=value}},
  setTimeout:fn=>timers.push(fn)});
 return {state:window.__state(),swing:window.__swing,credit:window.__credit,
  results:window.__results,element:el,writes,storage,timers,
  tick(){const fn=timers.shift();assert.ok(fn,'animation timer exists');fn()}};
}
function game(app,patch={}){
 Object.assign(app.state,{
  screen:'Game',mode:'Season',gameStarted:true,gameFinished:false,
  inning:3,innings:3,outs:1,home:2,away:2,reps:0,hits:0,
  zone:5,contact:'HARD',bases:[true,true,true],log:[],feedback:'',
  handoff:false,rivalryTurn:'home',finalReason:'',
  rivalryStats:{away:{reps:0,hits:0},home:{reps:0,hits:0}}
 },patch);
 return app.state;
}
function isolated(app){
 assert.equal(app.storage[LEGACY],'v6.3-sentinel-unchanged');
 assert.ok(app.writes.every(([key])=>key===KEY),'writes only the experimental V7 key');
}
test('tied final inning: loaded triple credits only the winning run',()=>{
 const app=boot();const s=game(app);
 app.swing();
 assert.equal(s.home,3);assert.equal(s.away,2);
 assert.equal(s.gameFinished,true);assert.match(s.finalReason,/Walk-off/);
 assert.equal(s.reps,1);assert.equal(s.hits,1);
 assert.equal(s.log[0],'TRIPLE!');
 isolated(app);
});
test('down one: loaded triple credits the two runs needed to win, not all three',()=>{
 const app=boot();const s=game(app,{home:1,away:2});
 app.swing();
 assert.equal(s.home,3);assert.equal(s.away,2);
 assert.equal(s.gameFinished,true);
 isolated(app);
});
test('tied final inning: loaded double stops scoring at winning run',()=>{
 const app=boot([0,.2]);const s=game(app);
 app.swing();
 assert.equal(s.home,3);assert.equal(s.gameFinished,true);
 assert.equal(s.log[0],'DOUBLE!');
});
test('down one: loaded double correctly credits both runs required',()=>{
 const app=boot([0,.2]);const s=game(app,{home:1,away:2});
 app.swing();
 assert.equal(s.home,3);assert.equal(s.gameFinished,true);
});
test('earlier innings keep every legitimate run on a triple',()=>{
 const app=boot();const s=game(app,{inning:2});
 app.swing();
 assert.equal(s.home,5);assert.equal(s.gameFinished,false);
});
test('extra-inning non-homer walkoff is also capped at the winning run',()=>{
 const app=boot();const s=game(app,{inning:4,extraInnings:1});
 app.swing();
 assert.equal(s.home,3);assert.equal(s.gameFinished,true);
 assert.equal(s.inning,4);
});
test('visiting Family Rivalry player gets all three triple runs, never a walkoff',()=>{
 const app=boot();const s=game(app,{mode:'Family Rivalry',rivalryTurn:'away'});
 app.swing();
 assert.equal(s.away,5);assert.equal(s.home,2);
 assert.equal(s.gameFinished,false);
 assert.equal(s.rivalryStats.away.reps,1);
 assert.equal(s.rivalryStats.away.hits,1);
});
test('home Family Rivalry triple credits winning run and correct batter stats',()=>{
 const app=boot();const s=game(app,{mode:'Family Rivalry',rivalryTurn:'home'});
 app.swing();
 assert.equal(s.home,3);assert.equal(s.away,2);
 assert.equal(s.gameFinished,true);
 assert.equal(s.rivalryStats.home.reps,1);
 assert.equal(s.rivalryStats.home.hits,1);
 assert.equal(s.rivalryStats.away.reps,0);
});
test('Family Rivalry walkoff grand slam still counts all four runs',()=>{
 const app=boot([0,0]);const s=game(app,{mode:'Family Rivalry',home:1,away:2});
 app.swing();
 assert.equal(s.home,5);assert.equal(s.away,2);
 assert.equal(s.gameFinished,true);
 assert.equal(s.log[0],'HOME RUN!');
});
test('CPU walkoff grand slam still counts all four runs',()=>{
 const app=boot([0,0]);const s=game(app,{home:1,away:2});
 app.swing();
 assert.equal(s.home,5);assert.equal(s.gameFinished,true);
});
test('non-scoring final-inning single does not end the game',()=>{
 const app=boot([0,.6]);const s=game(app,{bases:[false,false,false]});
 app.swing();
 assert.equal(s.home,2);assert.equal(s.away,2);
 assert.equal(s.gameFinished,false);
 assert.equal(s.reps,1);
});
test('third out of visiting Family Rivalry half preserves handoff message and log order',()=>{
 const app=boot([.99]);const s=game(app,{
  mode:'Family Rivalry',inning:1,outs:2,rivalryTurn:'away',
  bases:[true,false,true],home:0,away:0
 });
 app.swing();
 assert.equal(s.inning,1);assert.equal(s.outs,0);
 assert.equal(s.rivalryTurn,'home');assert.equal(s.handoff,true);
 assert.match(s.feedback,/SWITCH PLAYERS · HOME TEAM BATS/);
 assert.match(s.log[0],/TOP 1 COMPLETE/);
 assert.equal(s.log[1],'BALL IN PLAY — OUT');
 assert.deepEqual(Array.from(s.bases),[false,false,false]);
 isolated(app);
});
test('third out of home Family Rivalry half preserves next-inning handoff message',()=>{
 const app=boot([.99]);const s=game(app,{
  mode:'Family Rivalry',inning:1,outs:2,rivalryTurn:'home',
  bases:[false,true,false],home:0,away:0
 });
 app.swing();
 assert.equal(s.inning,2);assert.equal(s.outs,0);
 assert.equal(s.rivalryTurn,'away');assert.equal(s.handoff,true);
 assert.match(s.feedback,/INNING 1 COMPLETE · SWITCH PLAYERS/);
 assert.equal(s.log[0],'BALL IN PLAY — OUT');
 assert.deepEqual(Array.from(s.bases),[false,false,false]);
});
test('CPU third out preserves next visitor TOP and player BOTTOM feedback',()=>{
 const app=boot([.99,.99,.99,.99]);const s=game(app,{
  mode:'Season',inning:1,outs:2,home:0,away:0,bases:[true,false,true]
 });
 app.swing();
 assert.equal(s.inning,2);assert.equal(s.outs,0);
 assert.equal(s.away,0);
 assert.match(s.feedback,/TOP 2 COMPLETE · OPPONENT \+0 · YOUR TURN TO BAT/);
 assert.match(s.log[0],/OPPONENT: 0 RUNS IN INNING 2/);
 assert.equal(s.log[1],'BALL IN PLAY — OUT');
 isolated(app);
});
test('final third out ends a trailing CPU game without an extra opponent inning',()=>{
 const app=boot([.99]);const s=game(app,{
  mode:'Season',inning:3,outs:2,home:0,away:1,bases:[false,false,false]
 });
 app.swing();
 assert.equal(s.gameFinished,true);assert.equal(s.inning,4);
 assert.equal(s.away,1);assert.equal(s.log[0],'BALL IN PLAY — OUT');
 assert.equal(s.log.filter(x=>x.startsWith('OPPONENT:')).length,0);
 app.tick();
 assert.equal(s.screen,'Results');
 isolated(app);
});
test('training swings remain isolated from live scores and are not walkoff-capped',()=>{
 const app=boot();const s=game(app,{
  screen:'Drill',mode:'Family Rivalry',drill:'Barrel Control',
  trainingReps:0,trainingHits:0,trainingLog:[]
 });
 app.swing();
 assert.equal(s.trainingReps,1);assert.equal(s.trainingHits,1);
 assert.equal(s.trainingFeedback,'TRIPLE!');
 assert.equal(s.home,2);assert.equal(s.away,2);
 assert.equal(s.gameFinished,false);
 assert.deepEqual(Array.from(s.bases),[true,true,true]);
 isolated(app);
});
test('completed walkoff result survives JSON reload without changing legacy sentinel',()=>{
 const first=boot();const s=game(first);
 first.swing();
 const saved=JSON.parse(first.storage[KEY]);
 assert.equal(saved.home,3);assert.equal(saved.gameFinished,true);
 const resumed=boot([.99],saved);
 assert.equal(resumed.state.screen,'Home');
 assert.equal(resumed.state.home,3);
 assert.equal(resumed.state.gameFinished,true);
 assert.match(resumed.results(),/Final Score/);
 assert.match(resumed.results(),/GAME COMPLETE — WIN/);
 assert.equal(resumed.writes.length,0,'reading results does not rewrite save');
 isolated(first);isolated(resumed);
});

test('visible CPU transition message survives ball-flight animation settlement',()=>{
 const app=boot([.99,.99,.99,.99]);const s=game(app,{
  mode:'Season',inning:1,outs:2,home:0,away:0,bases:[false,false,false]
 });
 app.swing();
 assert.match(s.feedback,/TOP 2 COMPLETE/);
 app.tick();
 assert.equal(s.animating,false);
 assert.match(app.element('feedback').textContent,/TOP 2 COMPLETE · OPPONENT \+0/);
 assert.doesNotMatch(app.element('feedback').textContent,/BALL IN PLAY — OUT/);
 isolated(app);
});
test('ordinary swing still displays its outcome after the animation settles',()=>{
 const app=boot([0,.6]);const s=game(app,{
  inning:1,bases:[false,false,false]
 });
 app.swing();app.tick();
 assert.equal(s.feedback,'SINGLE!');
 assert.equal(app.element('feedback').textContent,'SINGLE!');
});

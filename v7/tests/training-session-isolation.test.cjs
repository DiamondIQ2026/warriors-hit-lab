'use strict';
// V7-only regression coverage: drill reps must never overwrite an active game.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 script exists');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'V7 test hook anchor exists');
const script=match[1].replace(anchor,"window.__state=()=>state;window.__begin=beginGame;window.__finish=finishGame;window.__swing=swing;window.__home=home;window.__report=report;window.__drill=drill;window.__canResume=canResumeGame;"+anchor);
function boot(random=()=>.99){
 const elements={},listeners={},writes=[];
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>({style:{setProperty(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,localStorage:{getItem:()=>null,setItem:(k,v)=>writes.push([k,v])},
  setTimeout(){},Math:Object.assign(Object.create(Math),{random})});
 const click=(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}});
 return {state:window.__state(),begin:window.__begin,finish:window.__finish,swing:window.__swing,
  home:window.__home,report:window.__report,drill:window.__drill,canResume:window.__canResume,
  click,writes};
}
test('new game can be resumed before first swing',()=>{
 const app=boot();app.begin();
 assert.equal(app.state.gameStarted,true);
 assert.equal(app.state.reps,0);
 assert.equal(app.canResume(),true);
 assert.match(app.home(),/id="resumeGame"/);
});
test('finished game does not offer resume',()=>{
 const app=boot();app.begin();app.finish('Completed');
 assert.equal(app.state.gameStarted,false);
 assert.equal(app.canResume(),false);
 assert.doesNotMatch(app.home(),/id="resumeGame"/);
});
test('starting a drill preserves active game score, bases, inning and reps',()=>{
 const app=boot();app.begin();
 Object.assign(app.state,{home:4,away:2,inning:3,outs:1,reps:6,hits:4,bases:[true,false,true],
  trainingReps:8,trainingHits:7,trainingLog:[{zone:5,hit:true}]});
 app.click({drill:'Zone Precision'});
 assert.equal(app.state.screen,'Drill');
 assert.equal(app.state.gameStarted,true);
 assert.equal(app.state.home,4);assert.equal(app.state.away,2);
 assert.equal(app.state.inning,3);assert.equal(app.state.outs,1);
 assert.equal(app.state.reps,6);assert.equal(app.state.hits,4);
 assert.deepEqual(Array.from(app.state.bases),[true,false,true]);
 assert.equal(app.state.trainingReps,0);assert.equal(app.state.trainingHits,0);
 assert.equal(app.state.trainingLog.length,0);
});
test('successful drill swing only increments training counters and log',()=>{
 const app=boot(()=>0);
 Object.assign(app.state,{screen:'Drill',mode:'Season',reps:9,hits:5,home:3,away:4,outs:2,
  bases:[true,true,false],log:['GAME LOG'],feedback:'GAME FEEDBACK'});
 app.swing();
 assert.equal(app.state.trainingReps,1);assert.equal(app.state.trainingHits,1);
 assert.equal(app.state.trainingLog.length,1);
 assert.equal(app.state.reps,9);assert.equal(app.state.hits,5);
 assert.equal(app.state.home,3);assert.equal(app.state.away,4);
 assert.equal(app.state.outs,2);
 assert.deepEqual(Array.from(app.state.bases),[true,true,false]);
 assert.equal(app.state.feedback,'GAME FEEDBACK');
 assert.deepEqual(Array.from(app.state.log),['GAME LOG']);
 assert.match(app.state.trainingFeedback,/SINGLE|DOUBLE|TRIPLE|HOME RUN|WALL/);
});
test('missed drill swing never adds a game out or switches innings',()=>{
 const app=boot(()=>.99);
 Object.assign(app.state,{screen:'Drill',mode:'Family Rivalry',rivalryTurn:'away',inning:3,outs:2,
  handoff:false,gameStarted:true,reps:4,away:2,home:1});
 app.swing();
 assert.equal(app.state.trainingReps,1);assert.equal(app.state.trainingHits,0);
 assert.equal(app.state.outs,2);assert.equal(app.state.inning,3);
 assert.equal(app.state.rivalryTurn,'away');assert.equal(app.state.handoff,false);
 assert.equal(app.state.away,2);assert.equal(app.state.home,1);
 assert.equal(app.state.reps,4);
});
test('drill summary reads training counters instead of active-game counters',()=>{
 const app=boot();
 Object.assign(app.state,{reps:50,hits:40,trainingReps:2,trainingHits:1,
  trainingLog:[{zone:5,hit:true},{zone:5,hit:false}]});
 assert.match(app.drill(),/REPS 2\/25/);
 assert.match(app.drill(),/HITS 1/);
 assert.match(app.report(),/2 repetitions · 1 hits/);
 assert.doesNotMatch(app.report(),/50 repetitions/);
 assert.match(app.report(),/50%/);
});
test('starting another drill resets drill counters but not gameplay progress',()=>{
 const app=boot();app.begin();
 Object.assign(app.state,{reps:12,hits:8,home:6,trainingReps:5,trainingHits:4,
  trainingLog:[{zone:2,hit:true}],trainingFeedback:'OLD'});
 app.click({drill:'Barrel Control'});
 assert.equal(app.state.drill,'Barrel Control');
 assert.equal(app.state.reps,12);assert.equal(app.state.hits,8);
 assert.equal(app.state.home,6);assert.equal(app.state.gameStarted,true);
 assert.equal(app.state.trainingReps,0);assert.equal(app.state.trainingHits,0);
 assert.equal(app.state.trainingFeedback,'');
});
test('game swing remains independent of prior drill counters',()=>{
 const app=boot(()=>0);app.begin();
 Object.assign(app.state,{screen:'Game',trainingReps:5,trainingHits:3,trainingFeedback:'TRAINING'});
 app.swing();
 assert.equal(app.state.reps,1);assert.equal(app.state.hits,1);
 assert.equal(app.state.trainingReps,5);assert.equal(app.state.trainingHits,3);
 assert.equal(app.state.trainingFeedback,'TRAINING');
});
test('ending game early clears resume eligibility without touching drill stats',()=>{
 const app=boot();app.begin();app.state.trainingReps=7;
 app.click({go:'Results'});
 assert.equal(app.state.screen,'Results');
 assert.equal(app.state.gameStarted,false);
 assert.equal(app.state.gameFinished,true);
 assert.equal(app.state.trainingReps,7);
 assert.equal(app.canResume(),false);
});
test('legacy active V7 game with recorded reps remains resumable',()=>{
 const app=boot();
 Object.assign(app.state,{gameStarted:false,gameFinished:false,reps:3});
 assert.equal(app.canResume(),true);
});
test('drill state is persisted using only the isolated V7 prototype key',()=>{
 const app=boot();app.click({drill:'Quick Hands'});
 assert.ok(app.writes.length>0);
 const [key,value]=app.writes.at(-1);
 assert.equal(key,'hitlab-v7-visual-prototype-only');
 const saved=JSON.parse(value);
 assert.equal(saved.trainingReps,0);
 assert.equal(saved.trainingHits,0);
 assert.equal(saved.screen,'Drill');
});

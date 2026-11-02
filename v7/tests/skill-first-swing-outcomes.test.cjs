'use strict';
// Deterministic, isolated V7 prototype checks for skill-first tee-swing simulation.
// Run: node --test v7/tests/skill-first-swing-outcomes.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 experimental inline script must exist');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'V7 test hook must remain available');
const script=match[1].replace(anchor,
  "window.__state=()=>state;window.__prob=hitProbability;window.__swing=swing;"+anchor);

function boot(rolls=[.99]){
 const elements={};
 const writes=[];
 const timers=[];
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},
  style:{setProperty(){}},appendChild(){},querySelectorAll(){return []}
 });
 const document={
  getElementById:el,addEventListener(){},
  createElement:()=>({style:{setProperty(){}},setAttribute(){}})
 };
 const window={scrollTo(){}};
 const random=Object.create(Math);
 let index=0;
 random.random=()=>index<rolls.length?rolls[index++]:.99;
 const localStorage={
  getItem(){return null},
  setItem(key,value){writes.push({key,value})}
 };
 vm.runInNewContext(script,{document,window,localStorage,Math:random,
  setTimeout:callback=>timers.push(callback)});
 return {state:window.__state(),prob:window.__prob,swing:window.__swing,
  writes,timers};
}
function game(contact,zone,difficulty,rolls){
 const app=boot(rolls);
 Object.assign(app.state,{screen:'Game',gameStarted:true,mode:'Exhibition',
  contact,zone,difficulty,inning:1,innings:3,home:0,away:0,outs:0,
  bases:[false,false,false],reps:0,hits:0,gameFinished:false});
 app.swing();
 return app;
}

test('all nine zones preserve HARD > MEDIUM > SOFT across difficulties',()=>{
 const app=boot();
 for(const difficulty of ['Rookie','Veteran','All-Star']){
  for(let zone=1;zone<=9;zone++){
   const soft=app.prob('SOFT',zone,difficulty);
   const medium=app.prob('MEDIUM',zone,difficulty);
   const hard=app.prob('HARD',zone,difficulty);
   assert.ok(hard>medium&&medium>soft,
    difficulty+' zone '+zone+' must reward selected contact quality');
   assert.ok(soft>0&&hard<1);
  }
  assert.ok(app.prob('MEDIUM',5,difficulty)>app.prob('MEDIUM',2,difficulty));
  assert.ok(app.prob('MEDIUM',2,difficulty)>app.prob('MEDIUM',1,difficulty));
 }
});

test('identical tee-swing roll rewards HARD contact over SOFT contact',()=>{
 const hard=game('HARD',5,'Rookie',[.5,.99]);
 const soft=game('SOFT',1,'Rookie',[.5,.99]);
 assert.equal(hard.state.hits,1);
 assert.equal(hard.state.reps,1);
 assert.deepEqual(Array.from(hard.state.bases),[true,false,false]);
 assert.equal(hard.state.outs,0);
 assert.equal(soft.state.hits,0);
 assert.equal(soft.state.reps,1);
 assert.equal(soft.state.outs,1);
 assert.deepEqual(Array.from(soft.state.bases),[false,false,false]);
 assert.equal(soft.state.home,0);
 assert.equal(soft.state.away,0);
});

test('same contact and roll reward center zone over a corner',()=>{
 const center=game('MEDIUM',5,'Rookie',[.60,.99]);
 const corner=game('MEDIUM',1,'Rookie',[.60,.99]);
 assert.equal(center.state.hits,1);
 assert.equal(center.state.outs,0);
 assert.equal(corner.state.hits,0);
 assert.equal(corner.state.outs,1);
});

test('same contact, zone and roll respect Rookie vs All-Star difficulty',()=>{
 const rookie=game('MEDIUM',5,'Rookie',[.60,.99]);
 const allStar=game('MEDIUM',5,'All-Star',[.60,.99]);
 assert.equal(rookie.state.hits,1);
 assert.equal(allStar.state.hits,0);
 assert.equal(allStar.state.outs,1);
});

test('contact choice changes extra-base result and scores only actual runs',()=>{
 const hard=game('HARD',5,'Veteran',[0,.03]);
 const medium=game('MEDIUM',5,'Veteran',[0,.03]);
 const soft=game('SOFT',5,'Veteran',[0,.03]);
 assert.match(hard.state.feedback,/HOME RUN/);
 assert.equal(hard.state.home,1);
 assert.deepEqual(Array.from(hard.state.bases),[false,false,false]);
 assert.match(medium.state.feedback,/TRIPLE/);
 assert.equal(medium.state.home,0);
 assert.deepEqual(Array.from(medium.state.bases),[false,false,true]);
 assert.match(soft.state.feedback,/DOUBLE/);
 assert.equal(soft.state.home,0);
 assert.deepEqual(Array.from(soft.state.bases),[false,true,false]);
 for(const app of [hard,medium,soft]){
  assert.equal(app.state.reps,1);
  assert.equal(app.state.hits,1);
  assert.equal(app.state.away,0);
 }
});

test('drill swings update only training statistics and the isolated V7 save key',()=>{
 const hard=boot([.6,.99]);
 const soft=boot([.6,.99]);
 for(const [app,contact] of [[hard,'HARD'],[soft,'SOFT']]){
  Object.assign(app.state,{screen:'Drill',drill:'Zone Precision',contact,zone:5,
   home:7,away:4,reps:3,hits:2,trainingReps:0,trainingHits:0,trainingLog:[]});
  app.swing();
  assert.equal(app.state.trainingReps,1);
  assert.equal(app.state.trainingLog.length,1);
  assert.equal(app.state.home,7);
  assert.equal(app.state.away,4);
  assert.equal(app.state.reps,3);
  assert.equal(app.state.hits,2);
  assert.ok(app.writes.length>0);
  assert.ok(app.writes.every(entry=>entry.key==='hitlab-v7-visual-prototype-only'));
 }
 assert.equal(hard.state.trainingHits,1);
 assert.equal(hard.state.trainingLog[0].hit,true);
 assert.equal(soft.state.trainingHits,0);
 assert.equal(soft.state.trainingLog[0].hit,false);
});

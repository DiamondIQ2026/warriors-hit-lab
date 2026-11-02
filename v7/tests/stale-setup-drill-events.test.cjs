'use strict';
// Regression for stale UI events in the isolated V7 prototype only.
// Synthetic/queued Game Setup events must not mutate a live Family Rivalry game.
// Existing Training Academy entry flows are preserved; drill IDs are validated.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'V7 prototype script is available');
const anchor="el('menuButton').onclick=";
assert.ok(source.includes(anchor),'V7 boot anchor exists');
const script=source.replace(anchor,"window.__read=()=>({state,health:gameSessionHealth(),trainingHealth:trainingSessionHealth()});"+anchor);
const KEY='hitlab-v7-visual-prototype-only';
const LEGACY='hitlab-v6.3-production';
function savedGame(overrides={}){
 return {mode:'Family Rivalry',gameStarted:true,gameFinished:false,
  inning:2,innings:3,outs:1,home:2,away:1,reps:7,hits:4,
  bases:[true,false,true],log:['SINGLE!'],handoff:true,rivalryTurn:'away',
  rivalryStats:{away:{reps:4,hits:2},home:{reps:3,hits:2}},
  trainingReps:2,trainingHits:1,drill:'Zone Precision',trainingLog:[
   {zone:5,contact:'HARD',hit:true},{zone:3,contact:'SOFT',hit:false}
  ],...overrides};
}
function boot(saved=savedGame()){
 const elements={},listeners={},writes=[];
 const storage={[KEY]:JSON.stringify(saved),[LEGACY]:'legacy-untouched'};
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},
  appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener:(name,cb)=>listeners[name]=cb,
  createElement:()=>({style:{setProperty(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 const random=Object.create(Math);random.random=()=>.99;
 vm.runInNewContext(script,{document,window,Math:random,setTimeout(){},
  localStorage:{getItem:key=>storage[key]??null,
   setItem:(key,value)=>{writes.push([key,value]);storage[key]=value}}});
 return {read:window.__read,writes,storage,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}}),
  change:(id,value)=>listeners.change({target:{id,value}})};
}
function snapshot(s){return JSON.stringify({
 mode:s.mode,ballpark:s.ballpark,innings:s.innings,difficulty:s.difficulty,
 rivalName:s.rivalName,homeName:s.homeName,
 inning:s.inning,outs:s.outs,home:s.home,away:s.away,
 reps:s.reps,hits:s.hits,bases:s.bases,log:s.log,handoff:s.handoff,
 rivalryTurn:s.rivalryTurn,rivalryStats:s.rivalryStats,
 trainingReps:s.trainingReps,trainingHits:s.trainingHits,trainingLog:s.trainingLog,
 drill:s.drill
});}
function unchanged(app,before,writes){
 assert.equal(snapshot(app.read().state),before);
 assert.equal(app.writes.length,writes,'stale event must not write V7 storage');
 assert.equal(app.storage[LEGACY],'legacy-untouched');
 assert.ok(app.writes.every(([key])=>key===KEY));
}
for(const screen of ['Home','Game','Results','Training']){
 test('queued Game Setup changes are inert on '+screen,()=>{
  const app=boot(),s=app.read().state;
  if(screen==='Game')app.click({},'resumeGame');
  else if(screen!=='Home')app.click({go:screen});
  const before=snapshot(s),writes=app.writes.length;
  for(const [id,value] of [
   ['mode','Exhibition'],['ballpark','trop'],['difficulty','Rookie'],
   ['rivalName','New Rival'],['homeName','New Home']])app.change(id,value);
  unchanged(app,before,writes);
  assert.equal(app.read().health.ok,true);
 });
 test('queued inning controls are inert on '+screen,()=>{
  const app=boot(),s=app.read().state;
  if(screen==='Game')app.click({},'resumeGame');
  else if(screen!=='Home')app.click({go:screen});
  const before=snapshot(s),writes=app.writes.length;
  for(const innings of ['3','6','9','0','12','3.5','abc'])app.click({innings});
  unchanged(app,before,writes);
 });
}
test('invalid setup values never rewrite a live save or the pending draft',()=>{
 const app=boot(),s=app.read().state;
 app.click({go:'Play'});
 const before=snapshot(s),writes=app.writes.length;
 for(const [id,value] of [
  ['mode','Bad Mode'],['difficulty','Expert'],['ballpark','other'],
  ['rivalName',null],['homeName',42],['unrelated','oops']
 ])app.change(id,value);
 for(const innings of ['0','2','4','10','3.5','abc'])app.click({innings});
 unchanged(app,before,writes);
 assert.equal(app.read().health.ok,true);
});
test('valid Game Setup edits remain draft-only until explicit replacement',()=>{
 const app=boot(),s=app.read().state;
 app.click({go:'Play'});
 const before=snapshot(s),writes=app.writes.length;
 app.change('mode','Season');app.change('difficulty','Rookie');
 app.change('rivalName','Updated Rival');app.change('homeName','Updated Home');
 app.click({innings:'9'});
 unchanged(app,before,writes);
 app.click({go:'Game'});
 assert.equal(s.screen,'Play','active game requires restart confirmation');
 assert.equal(s.mode,'Family Rivalry');
 app.click({},'cancelNewGame');
 assert.equal(snapshot(s),before);
 app.click({go:'Game'});
 app.click({},'confirmNewGame');
 assert.equal(s.mode,'Season');
 assert.equal(s.difficulty,'Rookie');
 assert.equal(s.innings,9);
 assert.equal(s.rivalName,'Updated Rival');
 assert.equal(s.homeName,'Updated Home');
 assert.equal(s.gameStarted,true);
 assert.equal(s.inning,1);
 assert.equal(s.trainingReps,2);
 assert.equal(s.trainingLog.length,2);
 assert.equal(app.storage[LEGACY],'legacy-untouched');
});
test('setup controls behind new-game confirmation cannot change pending choices',()=>{
 const app=boot(),s=app.read().state;
 app.click({go:'Play'});app.change('mode','Season');
 app.click({innings:'6'});app.click({go:'Game'});
 const before=snapshot(s),writes=app.writes.length;
 app.change('mode','Exhibition');app.change('difficulty','All-Star');
 app.click({innings:'9'});
 unchanged(app,before,writes);
 app.click({},'confirmNewGame');
 assert.equal(s.mode,'Season');
 assert.equal(s.innings,6);
 assert.equal(s.difficulty,'Veteran');
});
test('new game setup can still change mode, difficulty and innings when no game is active',()=>{
 const app=boot({}),s=app.read().state;
 app.click({go:'Play'});
 const writes=app.writes.length;
 app.change('mode','Tournament');app.change('difficulty','All-Star');
 app.click({innings:'9'});
 assert.equal(s.mode,'Tournament');
 assert.equal(s.difficulty,'All-Star');
 assert.equal(s.innings,9);
 assert.equal(app.writes.length,writes+3);
 assert.equal(app.storage[LEGACY],'legacy-untouched');
});
test('valid drill selection in Training still starts a new zero-rep session',()=>{
 const app=boot({}),s=app.read().state;
 app.click({go:'Training'});
 app.click({drill:'Quick Hands'});
 assert.equal(s.screen,'Drill');
 assert.equal(s.drill,'Quick Hands');
 assert.equal(s.trainingReps,0);
 assert.equal(s.trainingHits,0);
 assert.equal(s.trainingLog.length,0);
 assert.equal(app.read().trainingHealth.ok,true);
});
test('drill selector cannot bypass an open replacement confirmation',()=>{
 const app=boot(),s=app.read().state;
 app.click({go:'Training'});
 app.click({drill:'Barrel Control'});
 assert.equal(s.drill,'Zone Precision');
 const before=snapshot(s),writes=app.writes.length;
 app.click({drill:'Quick Hands'});
 unchanged(app,before,writes);
 app.click({},'confirmDrillChange');
 assert.equal(s.drill,'Barrel Control');
 assert.equal(s.trainingReps,0);
 assert.equal(app.storage[LEGACY],'legacy-untouched');
});
test('invalid drill name is rejected even from Training',()=>{
 const app=boot(),s=app.read().state;
 app.click({go:'Training'});
 const before=snapshot(s),writes=app.writes.length;
 app.click({drill:'Unknown Drill'});
 unchanged(app,before,writes);
});

test('completed Family Rivalry scoreboard is immutable while next matchup is drafted',()=>{
 const app=boot(savedGame({gameStarted:false,gameFinished:true,handoff:false,
  finalReason:'Completed 3 innings.',inning:4})),s=app.read().state;
 app.click({go:'Results'});
 const before=snapshot(s),writes=app.writes.length;
 app.click({go:'Play'});
 const afterNavigation=app.writes.length;
 app.change('mode','Season');app.change('difficulty','All-Star');
 app.change('rivalName','Other Rival');app.change('homeName','Other Home');
 app.click({innings:'9'});
 assert.equal(snapshot(s),before,'finished score and player identity remain unchanged');
 assert.equal(app.writes.length,afterNavigation,'draft choices are not persisted');
 app.click({go:'Results'});
 assert.equal(snapshot(s),before);
 assert.equal(s.mode,'Family Rivalry');
 assert.equal(s.rivalName,'Rival');
 assert.equal(s.homeName,'You');
 assert.ok(app.writes.length>=writes);
 assert.equal(app.storage[LEGACY],'legacy-untouched');
});
test('completed-game setup choices apply only when Play Again starts a new game',()=>{
 const app=boot(savedGame({gameStarted:false,gameFinished:true,handoff:false,
  finalReason:'Completed 3 innings.',inning:4})),s=app.read().state;
 app.click({go:'Play'});
 app.change('mode','Tournament');app.change('difficulty','Rookie');
 app.click({innings:'9'});
 assert.equal(s.mode,'Family Rivalry');
 assert.equal(s.innings,3);
 app.click({go:'Game'});
 assert.equal(s.mode,'Tournament');
 assert.equal(s.innings,9);
 assert.equal(s.difficulty,'Rookie');
 assert.equal(s.gameStarted,true);
 assert.equal(s.gameFinished,false);
 assert.equal(s.inning,1);
 assert.equal(s.home,0);
 assert.equal(s.away,0);
 assert.equal(s.trainingReps,2);
 assert.equal(s.trainingLog.length,2);
 assert.equal(app.storage[LEGACY],'legacy-untouched');
});
test('abandoned next-game draft cannot rewrite a finished result after reload',()=>{
 const app=boot(savedGame({gameStarted:false,gameFinished:true,handoff:false,
  finalReason:'Completed 3 innings.',inning:4})),s=app.read().state;
 app.click({go:'Play'});
 app.change('mode','Exhibition');
 app.change('rivalName','Temporary Name');
 app.click({innings:'6'});
 app.click({go:'Home'});
 assert.equal(s.mode,'Family Rivalry');
 assert.equal(s.rivalName,'Rival');
 assert.equal(s.innings,3);
 const saved=JSON.parse(app.storage[KEY]);
 assert.equal(saved.mode,'Family Rivalry');
 assert.equal(saved.rivalName,'Rival');
 assert.equal(saved.innings,3);
 assert.equal(saved.gameFinished,true);
 assert.equal(app.storage[LEGACY],'legacy-untouched');
});

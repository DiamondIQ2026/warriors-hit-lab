'use strict';
// Experimental V7-only active game restart and setup staging regressions.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 prototype inline script');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'V7 test hook');
const script=match[1].replace(anchor,
 "window.__setup=()=>({state,play:play(),pendingNewGame,pendingGameSetup,canResume:canResumeGame()});"+anchor);

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
 const random=Object.create(Math);random.random=()=>.99;
 vm.runInNewContext(script,{document,window,Math:random,setTimeout(){},
  localStorage:{getItem:key=>key==='hitlab-v7-visual-prototype-only'?v7:'v6.3-sentinel',
   setItem:(key,value)=>{writes.push([key,value]);if(key==='hitlab-v7-visual-prototype-only')v7=value}}});
 return {read:window.__setup,writes,saved:()=>v7,
  click:(dataset={},id='')=>listeners.click({target:{closest:()=>({dataset,id})}}),
  change:(id,value)=>listeners.change({target:{id,value}})};
}
function active(app,mode='Exhibition'){
 app.click({go:'Game'});
 const s=app.read().state;
 Object.assign(s,{mode,home:7,away:4,inning:5,outs:2,reps:11,hits:8,
  bases:[true,false,true],gameStarted:true,gameFinished:false,handoff:mode==='Family Rivalry',
  rivalryTurn:'away'});
 return s;
}
const snapshot=s=>JSON.stringify({mode:s.mode,home:s.home,away:s.away,inning:s.inning,
 outs:s.outs,reps:s.reps,hits:s.hits,bases:s.bases,gameStarted:s.gameStarted,
 gameFinished:s.gameFinished,handoff:s.handoff,rivalryTurn:s.rivalryTurn,
 innings:s.innings,difficulty:s.difficulty,rivalName:s.rivalName,homeName:s.homeName});

test('active-game setup edits are staged, never written to the saved game',()=>{
 const app=boot(),s=active(app);
 app.click({go:'Play'});
 const before=snapshot(s),saved=app.saved(),writes=app.writes.length;
 app.change('mode','Family Rivalry');
 app.change('difficulty','All-Star');
 app.change('rivalName','Dad');
 app.change('homeName','Maddon');
 app.click({innings:'9'});
 assert.equal(snapshot(s),before);
 assert.equal(app.saved(),saved);
 assert.equal(app.writes.length,writes);
 assert.match(app.read().play,/value="Dad"/);
 assert.match(app.read().play,/value="Maddon"/);
 assert.equal(app.read().pendingGameSetup.mode,'Family Rivalry');
 assert.equal(app.read().pendingGameSetup.innings,9);
});

test('start-new action requires an explicit confirmation for an active game',()=>{
 const app=boot(),s=active(app);
 app.click({go:'Play'});
 const before=snapshot(s),saved=app.saved();
 app.click({go:'Game'});
 assert.equal(s.screen,'Play');
 assert.equal(app.read().pendingNewGame,true);
 assert.match(app.read().play,/role="alertdialog" aria-label="Confirm new game"/);
 assert.match(app.read().play,/REPLACE CURRENT GAME\?/);
 assert.match(app.read().play,/KEEP CURRENT GAME/);
 assert.equal(snapshot(s),before);
 assert.equal(app.saved(),saved);
});

test('cancel preserves score, baserunners, handoff and resume',()=>{
 const app=boot(),s=active(app,'Family Rivalry');
 app.click({go:'Play'});
 const before=snapshot(s);
 app.change('mode','Exhibition');
 app.click({go:'Game'});
 app.click({},'cancelNewGame');
 assert.equal(app.read().pendingNewGame,false);
 assert.equal(snapshot(s),before);
 app.click({},'resumeGame');
 assert.equal(s.screen,'Game');
 assert.equal(snapshot(s),before);
 assert.equal(s.mode,'Family Rivalry');
 assert.equal(s.handoff,true);
});

test('confirmed restart applies staged settings and resets only game progress',()=>{
 const app=boot(),s=active(app);
 s.trainingReps=2;s.trainingHits=1;
 s.trainingLog=[{zone:5,contact:'HARD',hit:true},{zone:2,contact:'SOFT',hit:false}];
 app.click({go:'Play'});
 app.change('mode','Family Rivalry');
 app.change('rivalName','Dad');
 app.change('homeName','Maddon');
 app.change('difficulty','All-Star');
 app.click({innings:'9'});
 app.click({go:'Game'});
 app.click({},'confirmNewGame');
 assert.equal(s.screen,'Game');
 assert.equal(s.mode,'Family Rivalry');
 assert.equal(s.innings,9);
 assert.equal(s.difficulty,'All-Star');
 assert.equal(s.rivalName,'Dad');
 assert.equal(s.homeName,'Maddon');
 assert.equal(s.home,0);assert.equal(s.away,0);
 assert.equal(s.inning,1);assert.equal(s.outs,0);
 assert.equal(s.reps,0);assert.equal(s.hits,0);
 assert.equal(JSON.stringify(s.bases),JSON.stringify([false,false,false]));
 assert.equal(s.handoff,true);assert.equal(s.rivalryTurn,'away');
 assert.equal(s.trainingReps,2);assert.equal(s.trainingHits,1);
 assert.equal(s.trainingLog.length,2);
 assert.equal(app.read().pendingGameSetup,null);
 assert.equal(app.read().pendingNewGame,false);
 assert.deepEqual(new Set(app.writes.map(([key])=>key)),new Set(['hitlab-v7-visual-prototype-only']));
});

test('fresh game without an active session still starts immediately',()=>{
 const app=boot();
 app.click({go:'Play'});
 app.click({go:'Game'});
 assert.equal(app.read().state.screen,'Game');
 assert.equal(app.read().state.gameStarted,true);
 assert.equal(app.read().pendingNewGame,false);
 assert.equal(app.read().state.inning,1);
});

test('a stray confirm click cannot erase a game outside the setup prompt',()=>{
 const app=boot(),s=active(app);
 const before=snapshot(s),writes=app.writes.length;
 app.click({},'confirmNewGame');
 assert.equal(snapshot(s),before);
 assert.equal(app.writes.length,writes);
 app.click({go:'Play'});
 app.click({},'confirmNewGame');
 assert.equal(snapshot(s),before);
});

test('abandoning setup discards pending edits before the next visit',()=>{
 const app=boot(),s=active(app);
 app.click({go:'Play'});
 app.change('mode','Family Rivalry');
 app.click({innings:'9'});
 app.click({go:'Home'});
 assert.equal(app.read().pendingGameSetup,null);
 app.click({go:'Play'});
 assert.equal(app.read().pendingGameSetup.mode,'Exhibition');
 assert.equal(app.read().pendingGameSetup.innings,6);
 assert.equal(s.mode,'Exhibition');
 assert.equal(s.innings,6);
});

test('reload restores the original game, not abandoned draft settings',()=>{
 const app=boot(),s=active(app,'Family Rivalry');
 app.click({go:'Play'});
 const before=snapshot(s);
 app.change('mode','Exhibition');
 app.change('rivalName','Changed');
 app.click({innings:'9'});
 const restored=boot(app.saved());
 assert.equal(snapshot(restored.read().state),before);
 assert.equal(restored.read().state.screen,'Home');
 assert.equal(restored.read().pendingGameSetup,null);
 restored.click({},'resumeGame');
 assert.equal(restored.read().state.screen,'Game');
 assert.equal(snapshot(restored.read().state),before);
 assert.deepEqual(new Set(restored.writes.map(([key])=>key)),new Set(['hitlab-v7-visual-prototype-only']));
});

test('new-game confirmation and staged names render escaped, not as markup',()=>{
 const app=boot(),s=active(app);
 s.mode='<img src=x onerror=alert(1)>';
 app.click({go:'Play'});
 app.change('rivalName','<img src=x>');
 app.click({go:'Game'});
 const screen=app.read().play;
 assert.match(screen,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(screen,/value="&lt;img src=x&gt;"/);
 assert.doesNotMatch(screen,/<img src=x/);
});

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
const script=match[1].replace(anchor,"window.__state=()=>state;window.__complete=completeInning;window.__cpu=simulateOpponentHalf;window.__finish=finishGame;window.__begin=beginGame;"+anchor);
function setup(random=()=>0.99){
 const elements={};const listeners={};
 const el=id=>elements[id]??(elements[id]={innerHTML:'',textContent:'',disabled:false,classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},appendChild(){}});
 const document={getElementById:el,addEventListener:(name,cb)=>listeners[name]=cb,createElement:()=>({style:{setProperty(){}}})};
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},Math:Object.assign(Object.create(Math),{random})});
 return {state:window.__state(),complete:window.__complete,cpu:window.__cpu,finish:window.__finish,begin:window.__begin};
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

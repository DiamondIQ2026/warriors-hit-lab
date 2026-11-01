'use strict';
// Deterministic integration checks for CPU visitor TOP / player home BOTTOM inning order.
// These exercise the isolated V7 experimental prototype only, never V6.3 storage.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'experimental V7 script exists');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'test hook anchor exists');
const script=match[1].replace(anchor,"window.__state=()=>state;window.__begin=beginGame;window.__complete=completeInning;window.__swing=swing;"+anchor);
function boot(random=()=>.99){
 const elements={};
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
  classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},appendChild(){},querySelectorAll(){return []}
 });
 const document={getElementById:el,addEventListener(){},createElement:()=>({style:{setProperty(){}},setAttribute(){}})};
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},Math:Object.assign(Object.create(Math),{random})});
 return {state:window.__state(),begin:window.__begin,complete:window.__complete,swing:window.__swing};
}
test('visitor bats top of first inning before player starts batting',()=>{
 const app=boot(()=>0);
 app.state.mode='Season';app.state.difficulty='All-Star';app.begin();
 assert.equal(app.state.inning,1);
 assert.equal(app.state.away,5);
 assert.equal(app.state.home,0);
 assert.equal(app.state.outs,0);
 assert.equal(app.state.gameFinished,false);
 assert.match(app.state.log[0],/OPPONENT: 5 RUNS IN INNING 1/);
 assert.match(app.state.feedback,/TOP 1 COMPLETE/);
});
test('CPU does not receive a second half-inning before home makes three outs',()=>{
 const app=boot(()=>0);
 app.state.mode='Exhibition';app.begin();
 assert.equal(app.state.away,5);
 app.state.outs=2;
 assert.equal(app.state.away,5);
 app.state.outs=3;app.complete();
 assert.equal(app.state.inning,2);
 assert.equal(app.state.away,10);
 assert.equal(app.state.outs,0);
 assert.match(app.state.log[0],/OPPONENT: 5 RUNS IN INNING 2/);
});
test('home leads after top of regulation final: skip unnecessary bottom half',()=>{
 const app=boot(()=>.99);
 Object.assign(app.state,{mode:'Season',inning:2,innings:3,home:6,away:2,outs:3});
 app.complete();
 assert.equal(app.state.inning,3);
 assert.equal(app.state.gameFinished,true);
 assert.equal(app.state.home,6);
 assert.equal(app.state.away,2);
 assert.match(app.state.finalReason,/Home team leads after top of inning 3/);
});
test('visitor leads after top of final: home gets last chance to bat',()=>{
 const app=boot(()=>0);
 Object.assign(app.state,{mode:'Season',inning:2,innings:3,home:0,away:0,outs:3});
 app.complete();
 assert.equal(app.state.inning,3);
 assert.equal(app.state.away,5);
 assert.equal(app.state.gameFinished,false);
});
test('CPU-mode home walkoff ends game without a second CPU turn',()=>{
 const app=boot(()=>0);
 Object.assign(app.state,{screen:'Game',mode:'Season',inning:3,innings:3,home:3,away:3,outs:1,contact:'HARD',zone:5,bases:[false,false,false],gameFinished:false});
 app.swing();
 assert.equal(app.state.gameFinished,true);
 assert.equal(app.state.home,4);
 assert.equal(app.state.away,3);
 assert.equal(app.state.inning,3);
 assert.match(app.state.finalReason,/Walk-off/);
});
test('leading hit before regulation final is not a walkoff',()=>{
 const app=boot(()=>0);
 Object.assign(app.state,{screen:'Game',mode:'Season',inning:2,innings:3,home:3,away:3,contact:'HARD',zone:5,bases:[false,false,false],gameFinished:false});
 app.swing();
 assert.equal(app.state.home,4);
 assert.equal(app.state.gameFinished,false);
});
test('final bottom three outs ends game without extra visitor scoring',()=>{
 const app=boot(()=>0);
 Object.assign(app.state,{mode:'Season',inning:3,innings:3,home:2,away:4,outs:3});
 app.complete();
 assert.equal(app.state.gameFinished,true);
 assert.equal(app.state.away,4);
 assert.equal(app.state.inning,4);
});
test('tied regulation opens extra inning with visitor batting first',()=>{
 const app=boot(()=>0);
 Object.assign(app.state,{mode:'Season',inning:3,innings:3,home:2,away:2,outs:3});
 app.complete();
 assert.equal(app.state.inning,4);
 assert.equal(app.state.extraInnings,1);
 assert.equal(app.state.away,7);
 assert.equal(app.state.gameFinished,false);
});
test('family rivalry never invokes CPU on new game or on half-inning changes',()=>{
 const app=boot(()=>0);
 app.state.mode='Family Rivalry';app.begin();
 assert.equal(app.state.away,0);
 assert.equal(app.state.handoff,true);
 app.state.outs=3;app.complete();
 assert.equal(app.state.rivalryTurn,'home');
 assert.equal(app.state.away,0);
 app.state.outs=3;app.complete();
 assert.equal(app.state.inning,2);
 assert.equal(app.state.away,0);
});
test('a walkoff with bases loaded preserves all earned home-run runs',()=>{
 const app=boot(()=>0);
 Object.assign(app.state,{screen:'Game',mode:'Season',inning:3,innings:3,home:1,away:2,contact:'HARD',zone:5,bases:[true,true,true],gameFinished:false});
 app.swing();
 assert.equal(app.state.home,5);
 assert.equal(app.state.away,2);
 assert.equal(app.state.gameFinished,true);
});
test('fielder animation translates toward the target before rotating the marker',()=>{
 assert.match(html,/transform:translate\(var\(--fielder-step-x,0px\),var\(--fielder-step-y,0px\)\) rotate\(45deg\)/);
});

'use strict';
// Run from repository root: node --test v7/tests/nine-zone-boundaries.test.cjs
// Regression: only zones 1–9 may enter the swing model, including after reloading a saved preview.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 prototype inline script exists');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'V7 test hook anchor exists');
const script=match[1].replace(anchor,"window.__state=()=>state;"+anchor);
function boot(saved=null){
 const elements={},listeners={};
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',disabled:false,
  classList:{add(){},remove(){},toggle(){}},
  style:{setProperty(){}},appendChild(){}
 });
 const document={
  getElementById:el,
  addEventListener:(name,handler)=>listeners[name]=handler,
  createElement:()=>({style:{setProperty(){}}})
 };
 const window={scrollTo(){}};
 let value=saved;
 const localStorage={getItem:()=>value,setItem:(_key,next)=>{value=next}};
 vm.runInNewContext(script,{document,window,localStorage,setTimeout(){}});
 return {
  state:()=>window.__state(),
  clickZone:zone=>listeners.click({target:{id:'',dataset:{zone},closest(){return this}}}),
  saved:()=>value
 };
}
test('all nine legal zones remain selectable and persist correctly',()=>{
 const app=boot();
 for(let zone=1;zone<=9;zone++){
  app.clickZone(String(zone));
  assert.equal(app.state().zone,zone);
  assert.equal(JSON.parse(app.saved()).zone,zone);
 }
});
test('out-of-range and malformed zone inputs never mutate the selected zone',()=>{
 const app=boot();
 app.clickZone('7');
 const before=app.saved();
 for(const zone of ['0','10','-1','2.5','NaN','Infinity','garbage','  ','1000000']){
  app.clickZone(zone);
  assert.equal(app.state().zone,7,'invalid zone: '+zone);
  assert.equal(app.saved(),before,'invalid input must not write storage: '+zone);
 }
});
test('saved malformed zone values recover to middle-middle without touching other settings',()=>{
 for(const invalid of [0,10,-1,3.5,'9','not-a-zone',null]){
  const app=boot(JSON.stringify({zone:invalid,contact:'HARD',mode:'Family Rivalry'}));
  assert.equal(app.state().zone,5,'invalid saved zone: '+String(invalid));
  assert.equal(app.state().contact,'HARD');
  assert.equal(app.state().mode,'Family Rivalry');
 }
});
test('valid saved corner zone survives reload',()=>{
 const app=boot(JSON.stringify({zone:9,contact:'SOFT'}));
 assert.equal(app.state().zone,9);
 assert.equal(app.state().contact,'SOFT');
});

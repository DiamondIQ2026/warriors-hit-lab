'use strict';
// Run: node --test v7/tests/base-running-edge.test.cjs
// Isolated regression of the prototype's base advancement algorithm.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'Prototype script exists');
const script=match[1].replace("el('menuButton').onclick=","window.__state=()=>state;window.__advance=advanceBases;el('menuButton').onclick=");
function setup(bases){
 const elements={};const listeners={};
 const el=id=>elements[id]??(elements[id]={innerHTML:'',textContent:'',disabled:false,classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},appendChild(){}});
 const document={getElementById:el,addEventListener:(name,cb)=>listeners[name]=cb,createElement:()=>({style:{setProperty(){}}})};
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,localStorage:{getItem:()=>null,setItem(){}},setTimeout(){}});
 window.__state().bases=bases.slice();
 return {advance:window.__advance,state:window.__state};
}
const cases=[
 {name:'empty bases single',before:[false,false,false],hit:1,runs:0,after:[true,false,false]},
 {name:'runner on first double',before:[true,false,false],hit:2,runs:0,after:[false,true,true]},
 {name:'runner on second single',before:[false,true,false],hit:1,runs:0,after:[true,false,true]},
 {name:'runner on third single',before:[false,false,true],hit:1,runs:1,after:[true,false,false]},
 {name:'loaded double',before:[true,true,true],hit:2,runs:2,after:[false,true,true]},
 {name:'loaded triple',before:[true,true,true],hit:3,runs:3,after:[false,false,true]},
 {name:'loaded homer',before:[true,true,true],hit:4,runs:4,after:[false,false,false]}
];
for(const c of cases)test(c.name,()=>{
 const app=setup(c.before);
 assert.equal(app.advance(c.hit),c.runs);
 assert.deepEqual(Array.from(app.state().bases),c.after);
});
test('invalid hit distances rejected without modifying bases',()=>{
 const app=setup([true,false,true]);
 for(const n of [0,5,-1,1.5,NaN])assert.throws(()=>app.advance(n),RangeError);
 assert.deepEqual(Array.from(app.state().bases),[true,false,true]);
});

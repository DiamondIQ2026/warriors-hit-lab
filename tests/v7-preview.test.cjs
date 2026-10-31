'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('v7/preview.html','utf8');
const js=fs.readFileSync('v7/flight-browser.js','utf8');
function run(reduced=false){
 const elements=new Map();
 function el(id){if(!elements.has(id))elements.set(id,{value:({zone:'MC',contact:'hard',outcome:'double',hand:'R'})[id],attributes:{},handlers:{},textContent:'',addEventListener(type,cb){this.handlers[type]=cb},setAttribute(k,v){this.attributes[k]=v}});return elements.get(id);}
 let pending=null;
 const context={document:{getElementById:el},performance:{now:()=>0},matchMedia:()=>({matches:reduced}),requestAnimationFrame(cb){pending=cb;return 1},cancelAnimationFrame(){pending=null}};
 vm.runInNewContext(js,context,{timeout:1000});
 return {el,advance(t){const cb=pending;pending=null;if(cb)cb(t)},get pending(){return pending}};
}
test('preview is self contained and has accessible playback controls',()=>{
 for(const id of ['field','trail','ball','zone','contact','outcome','hand','play','skip','replay','result'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/role="status"/);assert.match(html,/prefers-reduced-motion/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|fetch\(|indexedDB/);
});
test('play, skip, and replay complete a visual path without storage',()=>{
 const v=run();
 v.el('play').handlers.click();
 assert.match(v.el('result').textContent,/Simulating/);
 v.advance(1100);
 assert.ok(Number(v.el('ball').attributes.cy)<440);
 v.el('skip').handlers.click();
 assert.match(v.el('result').textContent,/Double.*complete/);
 assert.ok(v.el('trail').attributes.points.length>0);
 v.el('replay').handlers.click();
 v.advance(2200);
 assert.match(v.el('result').textContent,/complete/);
});
test('reduced motion immediately displays finished frame',()=>{
 const v=run(true);
 v.el('play').handlers.click();
 assert.match(v.el('result').textContent,/complete/);
 assert.equal(v.pending,null);
});

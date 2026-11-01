'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../alpha/shared-profile.cjs');
const root=path.join(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
test('validates explicit left/right batting handedness and limited names',()=>{
 assert.deepEqual(api.normalize({name:' Maddon ',team:' Tampa Warriors ',hand:'Left'}),{version:1,name:'Maddon',team:'Tampa Warriors',hand:'Left'});
 for(const hand of ['Switch','right','',null])assert.throws(()=>api.normalize({name:'Test',team:'Warriors',hand}));
 assert.throws(()=>api.normalize({name:' ',team:'Warriors',hand:'Right'}));
});
test('only accesses isolated alpha profile key and never deletes previous saves',()=>{
 const touched=[];const map=new Map();
 const storage={getItem:k=>{touched.push(['get',k]);return map.get(k)??null},setItem:(k,v)=>{touched.push(['set',k]);map.set(k,v)}};
 assert.equal(api.read(storage).status,'empty');
 api.save(storage,{name:'Player',team:'Warriors',hand:'Right'});
 assert.equal(api.read(storage).profile.name,'Player');
 assert.deepEqual([...new Set(touched.map(x=>x[1]))],[api.KEY]);
 assert.match(api.KEY,/^whl7:alpha:/);
});
test('corrupt and blocked storage fail closed without resetting state',()=>{
 assert.equal(api.read({getItem:()=>'{invalid'}).status,'unavailable');
 assert.equal(api.read({getItem:()=>{throw Error('blocked')}}).status,'unavailable');
 assert.throws(()=>api.save({setItem:()=>{throw Error('blocked')}},{name:'P',team:'T',hand:'Left'}));
});
test('both gameplay screens show shared profile as display-only context',()=>{
 for(const file of ['multiplayer.html','experimental/visual-prototype.html']){
  const html=load(file);
  assert.match(html,/shared-profile\.cjs/);
  assert.match(html,/display only; current game unchanged/);
 }
});
test('hub offers opt-in edit without mutating a saved active match',()=>{
 const hub=load('alpha/index.html');
 assert.match(hub, /id="profileForm"/);
 assert.match(hub,/api\.save\(localStorage/);
 assert.doesNotMatch(load('alpha/shared-profile.cjs'),/removeItem|clear\(/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../alpha/navigation-session.cjs');
const hub=fs.readFileSync(path.join(__dirname,'../alpha/index.html'),'utf8');
test('only whitelisted alpha routes are selectable',()=>{
 assert.equal(api.destination('cpu'),'../experimental/visual-prototype.html');
 assert.equal(api.destination('rivalry'),'../multiplayer.html');
 assert.throws(()=>api.destination('../main'));
 assert.throws(()=>api.select({setItem(){throw Error('should not write')}},'evil'));
});
test('navigation state reads and writes only its own V7 key',()=>{
 const accessed=[], data=new Map();
 const store={getItem:k=>{accessed.push(['get',k]);return data.get(k)??null},setItem:(k,v)=>{accessed.push(['set',k]);data.set(k,v)}};
 assert.equal(api.read(store).status,'empty');
 api.select(store,'rivalry');
 assert.equal(api.read(store).session.mode,'rivalry');
 api.select(store,'cpu');
 assert.equal(api.read(store).session.mode,'cpu');
 assert.deepEqual([...new Set(accessed.map(x=>x[1]))],[api.KEY]);
 assert.match(api.KEY,/^whl7:alpha:/);
});
test('invalid and inaccessible saved sessions fail closed',()=>{
 assert.equal(api.read({getItem:()=>'{garbled'}).status,'unavailable');
 assert.equal(api.read({getItem:()=>JSON.stringify({version:1,mode:'../../v6'})}).status,'unavailable');
 assert.equal(api.read({getItem:()=>{throw Error('blocked')}}).status,'unavailable');
});
test('hub includes both explicit choices and a hidden resume action',()=>{
 assert.match(hub,/data-alpha-mode="cpu"/);
 assert.match(hub,/data-alpha-mode="rivalry"/);
 assert.match(hub,/id="resumeAlpha"[^>]*hidden/);
 assert.match(hub,/navigation-session\.cjs/);
 assert.doesNotMatch(hub,/localStorage\.(?:removeItem|clear)/);
});

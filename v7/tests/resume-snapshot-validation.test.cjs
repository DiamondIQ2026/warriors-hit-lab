'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../alpha/active-game-registry.cjs');
const storage=(key,object)=>({getItem:k=>k===key?JSON.stringify(object):null});
test('CPU resume snapshot preserves inning score outs and base state',()=>{
 const s={gameStarted:true,gameFinished:false,inning:4,outs:2,away:3,home:5,bases:[true,false,true]};
 assert.deepEqual(api.snapshot(storage(api.KEYS.cpu,s),'cpu').snapshot,{inning:4,outs:2,away:3,home:5,bases:[true,false,true]});
});
test('Family Rivalry resume snapshot preserves batting order and half inning',()=>{
 const s={version:1,status:'active',home:{id:'dad'},away:{id:'maddon'},atBats:[],inning:6,half:'bottom',outs:1,
 score:{dad:6,maddon:4},battingOrder:{dad:3,maddon:7},bases:[false,true,false]};
 assert.deepEqual(api.snapshot(storage(api.KEYS.rivalry,s),'rivalry').snapshot,{
 inning:6,half:'bottom',outs:1,home:6,away:4,battingOrder:{home:3,away:7},bases:[false,true,false]});
});
test('invalid scores, outs and lineups block resume',()=>{
 const s={version:1,status:'active',home:{id:'dad'},away:{id:'maddon'},atBats:[],inning:2,half:'top',outs:3,
 score:{dad:0,maddon:0},battingOrder:{dad:0,maddon:0},bases:[false,false,false]};
 assert.equal(api.snapshot(storage(api.KEYS.rivalry,s),'rivalry').status,'invalid');
 s.outs=1;s.battingOrder.maddon=-1;
 assert.equal(api.snapshot(storage(api.KEYS.rivalry,s),'rivalry').status,'invalid');
});
test('finished and corrupt saves never produce resume snapshots',()=>{
 assert.equal(api.snapshot(storage(api.KEYS.cpu,{gameStarted:true,gameFinished:true,inning:4}),'cpu').snapshot,null);
 assert.equal(api.snapshot({getItem:()=>'{invalid'},'cpu').snapshot,null);
});
test('snapshot discovery only reads dedicated keys, never writes or deletes',()=>{
 const calls=[];const saved={gameStarted:true,gameFinished:false,inning:1,outs:0,away:0,home:0,bases:[false,false,false]};
 const store={getItem(k){calls.push(k);return k===api.KEYS.cpu?JSON.stringify(saved):null},setItem(){throw Error('unsafe')},removeItem(){throw Error('unsafe')}};
 assert.equal(api.snapshot(store,'cpu').status,'resumable');
 assert.deepEqual([...new Set(calls)],[api.KEYS.cpu]);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../alpha/active-game-registry.cjs');
const hub=fs.readFileSync(path.join(__dirname,'../alpha/index.html'),'utf8');
function storage(values){const calls=[];return {calls,getItem(k){calls.push(k);return Object.prototype.hasOwnProperty.call(values,k)?values[k]:null;}};}
test('read-only registry finds an active Family Rivalry match',()=>{
 const store=storage({[api.KEYS.rivalry]:JSON.stringify({version:1,home:{id:'dad'},away:{id:'maddon'},atBats:[],bases:[false,false,false],status:'active'})});
 assert.equal(api.inspect(store,'rivalry').status,'resumable');
 assert.deepEqual(store.calls,[api.KEYS.rivalry]);
});
test('CPU game requires explicit started indicator, not drill reps',()=>{
 const store=storage({[api.KEYS.cpu]:JSON.stringify({reps:20,gameStarted:false,gameFinished:false,inning:2})});
 assert.equal(api.inspect(store,'cpu').status,'not-confirmed');
});
test('completed, corrupt, empty, and blocked saves do not create resume entries',()=>{
 assert.equal(api.inspect(storage({[api.KEYS.cpu]:JSON.stringify({gameStarted:true,inning:2,gameFinished:true})}),'cpu').status,'finished');
 assert.equal(api.inspect(storage({[api.KEYS.cpu]:'{bad'}),'cpu').status,'invalid');
 assert.equal(api.inspect(storage({}),'cpu').status,'empty');
 assert.equal(api.inspect({getItem(){throw Error('blocked');}},'rivalry').status,'unavailable');
});
test('no write or delete API is used and key access is restricted',()=>{
 const keys=[];const store={getItem(k){keys.push(k);return null;},setItem(){throw Error('write not permitted');},removeItem(){throw Error('delete not permitted');}};
 assert.deepEqual(api.scan(store).map(v=>v.status),['empty','empty']);
 assert.deepEqual(keys,[api.KEYS.cpu,api.KEYS.rivalry]);
 assert.throws(()=>api.inspect(store,'v6'));
});
test('alpha hub uses read-only scan with clearly qualified resume wording',()=>{
 assert.match(hub,/active-game-registry\.cjs/);
 assert.match(hub,/registry\.scan\(localStorage\)/);
 assert.match(hub,/Game may be resumable/);
 assert.match(hub,/No confirmed active game/);
});

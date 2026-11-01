'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../alpha/unified-game-state.cjs');
test('CPU active game maps scores inning outs and base runners consistently',()=>{
 const state=api.normalize('cpu',{gameStarted:true,gameFinished:false,inning:4,outs:2,home:5,away:3,bases:[true,false,true]});
 assert.deepEqual({inning:state.inning,half:state.half,outs:state.outs,home:state.home,away:state.away,bases:state.bases}, {inning:4,half:'bottom',outs:2,home:5,away:3,bases:[true,false,true]});
 assert.equal(state.battingOrder,null);
});
test('Family Rivalry maps both independent lineup positions',()=>{
 const state=api.normalize('rivalry',{version:1,status:'active',home:{id:'dad'},away:{id:'maddon'},inning:3,half:'top',outs:1,score:{dad:4,maddon:2},battingOrder:{dad:3,maddon:7},bases:[false,true,false]});
 assert.deepEqual(state.battingOrder,{home:3,away:7});
 assert.equal(state.away,2);assert.equal(state.home,4);
});
test('invalid resumed game states fail closed',()=>{
 assert.throws(()=>api.normalize('cpu',{gameStarted:true,gameFinished:false,inning:1,outs:3,home:0,away:0,bases:[false,false,false]}));
 assert.throws(()=>api.normalize('rivalry',{version:1,status:'active',home:{id:'dad'},away:{id:'maddon'},inning:1,half:'top',outs:0,score:{dad:0,maddon:0},battingOrder:{dad:0,maddon:9},bases:[false,false,false]}));
 assert.throws(()=>api.normalize('v6',{}));
});
test('normalization is read-only and does not mutate source',()=>{
 const raw={gameStarted:true,gameFinished:false,inning:1,outs:0,home:0,away:0,bases:[false,false,false]};
 const before=JSON.stringify(raw);
 api.normalize('cpu',raw).bases[0]=true;
 assert.equal(JSON.stringify(raw),before);
});
test('alpha hub requires normalized state before showing resume link',()=>{
 const hub=fs.readFileSync(path.join(__dirname,'../alpha/index.html'),'utf8');
 assert.match(hub,/HitLabGameState\.normalize/);
 assert.match(hub,/if\(canOpen\)/);
 assert.match(hub,/unified-game-state\.cjs/);
});

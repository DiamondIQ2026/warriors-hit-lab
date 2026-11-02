'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {observe}=require('../v7/alpha/game-transition.cjs');
const state=(x={})=>({version:1,status:'active',home:{id:'dad'},away:{id:'maddon'},inning:2,half:'top',outs:2,score:{dad:1,maddon:2},battingOrder:{dad:2,maddon:4},bases:[false,false,false],...x});

test('legal top-to-bottom handoff clears runners and attributes away runs',()=>{
 const before=state({bases:[true,false,true]});
 const after=state({half:'bottom',outs:0,score:{dad:1,maddon:3}});
 const result=observe('rivalry',before,after);
 assert.equal(result.to.half,'bottom');
 assert.deepEqual(result.scoreDelta,{home:0,away:1});
 assert.deepEqual(before.bases,[true,false,true]);
});
test('legal bottom-to-top extra inning advances and attributes home runs',()=>{
 const before=state({half:'bottom',inning:3,bases:[true,false,false]});
 const after=state({half:'top',inning:4,outs:0,score:{dad:2,maddon:2}});
 const result=observe('rivalry',before,after);
 assert.equal(result.advancedInning,true);
 assert.equal(result.to.inning,4);
});
test('invalid half-inning jumps are rejected',()=>{
 assert.throws(()=>observe('rivalry',state(),state({inning:3,half:'top',outs:0})),/Inning can only advance/);
 assert.throws(()=>observe('rivalry',state({half:'bottom'}),state({half:'top',outs:0})),/Cannot return to top/);
 assert.throws(()=>observe('rivalry',state(),state({inning:3,half:'bottom',outs:0})),/Inning can only advance/);
});
test('runners may not carry across a half-inning boundary',()=>{
 assert.throws(()=>observe('rivalry',state(),state({half:'bottom',outs:0,bases:[true,false,false]})),/Runners must clear/);
});
test('only the team at bat may score, including during a handoff',()=>{
 assert.throws(()=>observe('rivalry',state(),state({score:{dad:2,maddon:2}})),/Home cannot score/);
 assert.throws(()=>observe('rivalry',state({half:'bottom'}),state({half:'bottom',score:{dad:1,maddon:3}})),/Away cannot score/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {observe}=require('../alpha/game-transition.cjs');
const cpu=(changes={})=>({gameStarted:true,gameFinished:false,inning:2,outs:0,home:1,away:2,bases:[false,false,false],...changes});
const rivalry=(changes={})=>({version:1,status:'active',home:{id:'dad'},away:{id:'maddon'},inning:2,half:'top',outs:0,score:{dad:1,maddon:2},battingOrder:{dad:2,maddon:4},bases:[false,false,false],...changes});
test('CPU gameplay transition reports a single recorded run and out',()=>{
 const result=observe('cpu',cpu(),cpu({home:2,outs:1}));
 assert.deepEqual(result.scoreDelta,{home:1,away:0});
 assert.equal(result.advancedInning,false);
});
test('Family Rivalry verifies advancing outs and a half-inning handoff',()=>{
 assert.equal(observe('rivalry',rivalry(),rivalry({outs:1})).to.outs,1);
 const from=rivalry({outs:2});
 const to=rivalry({half:'bottom',outs:0});
 assert.equal(observe('rivalry',from,to).to.half,'bottom');
});
test('rejects decreasing scores, inning regressions and impossible outs',()=>{
 assert.throws(()=>observe('cpu',cpu(),cpu({away:1})));
 assert.throws(()=>observe('cpu',cpu(),cpu({inning:1})));
 assert.throws(()=>observe('rivalry',rivalry(),rivalry({outs:2})));
 assert.throws(()=>observe('rivalry',rivalry({outs:2}),rivalry({half:'bottom',outs:1})));
});
test('read-only transition leaves original save payload objects untouched',()=>{
 const before=cpu(),after=cpu({outs:1}),a=JSON.stringify(before),b=JSON.stringify(after);
 observe('cpu',before,after);
 assert.equal(JSON.stringify(before),a);
 assert.equal(JSON.stringify(after),b);
});

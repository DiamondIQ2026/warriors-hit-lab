'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const shared=require('../alpha/baseball-rules.cjs');
const multi=require('../pass-and-play.cjs');
test('shared runner rules match existing Family Rivalry engine for every base pattern and hit',()=>{
 for(let mask=0;mask<8;mask++)for(const [outcome,n] of Object.entries({single:1,double:2,triple:3,homer:4})){
  const bases=[0,1,2].map(i=>Boolean(mask&(1<<i)));
  assert.deepEqual(shared.advance(bases,n),multi.scoreRuns(bases,outcome));
 }
});
test('home runs clear runners and award each runner plus batter',()=>{
 assert.deepEqual(shared.advance([true,true,true],4),{bases:[false,false,false],runs:4});
});
test('third out clears all runners without mutating original',()=>{
 const bases=[true,false,true];const result=shared.afterThirdOut();
 assert.deepEqual(result,{outs:0,bases:[false,false,false]});
 assert.deepEqual(bases,[true,false,true]);
});
test('invalid runner state and hit values rejected',()=>{
 assert.throws(()=>shared.advance([true,false],1));
 assert.throws(()=>shared.advance([true,false,false],5));
});

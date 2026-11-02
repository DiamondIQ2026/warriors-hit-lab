'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../v7/alpha/nine-zone-rules.cjs');

test('3x3 arrows move to the physically adjacent zone',()=>{
 assert.equal(rules.move(4,'ArrowRight'),5);
 assert.equal(rules.move(4,'ArrowLeft'),3);
 assert.equal(rules.move(4,'ArrowUp'),1);
 assert.equal(rules.move(4,'ArrowDown'),7);
 assert.equal(rules.move(0,'ArrowDown'),3);
 assert.equal(rules.move(8,'ArrowUp'),5);
});

test('arrows stop at the net edges instead of wrapping rows or columns',()=>{
 for(const i of [0,3,6])assert.equal(rules.move(i,'ArrowLeft'),i);
 for(const i of [2,5,8])assert.equal(rules.move(i,'ArrowRight'),i);
 for(const i of [0,1,2])assert.equal(rules.move(i,'ArrowUp'),i);
 for(const i of [6,7,8])assert.equal(rules.move(i,'ArrowDown'),i);
});

test('unsupported keys preserve focus; invalid indexes fail closed',()=>{
 assert.equal(rules.move(4,'Enter'),4);
 assert.equal(rules.move(4,' '),4);
 for(const bad of [-1,9,1.5,NaN,'4',null])assert.throws(()=>rules.move(bad,'ArrowDown'),/Invalid nine-zone index/);
 assert.deepEqual(rules.ZONES,['UL','UC','UR','ML','MC','MR','LL','LC','LR']);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {describeFlight,atTime,ZONES,HIT_TYPES,CONTACT}=require('../v7/flight-model.cjs');

test('all nine zones, three strengths and five outcomes produce bounded paths',()=>{
 for(const zone of ZONES)for(const contact of CONTACT)for(const outcome of HIT_TYPES){
   const f=describeFlight({zone,contact,outcome,hand:'R'});
   assert.equal(f.simulated,true);
   assert.equal(f.points.length,3);
   assert.equal(f.points[0].x,0);
   assert.equal(f.points[0].y,0);
   assert.ok(f.points.every(p=>p.t>=0&&p.t<=1&&Number.isFinite(p.x)&&Number.isFinite(p.y)));
   assert.ok(f.points.every(p=>p.x>=-1&&p.x<=1&&p.y>=0&&p.y<=1));
   assert.equal(atTime(f,0).done,false);
   assert.equal(atTime(f,99999).done,true);
 }
});
test('full outcome mapping is consistent',()=>{
 assert.deepEqual(HIT_TYPES.map(outcome=>describeFlight({zone:'MC',contact:'hard',outcome}).basesEarned),[0,1,2,3,4]);
});
test('mirrors pull-direction between right and left hitters',()=>{
 const r=describeFlight({zone:'MC',contact:'medium',outcome:'double',hand:'R'});
 const l=describeFlight({zone:'MC',contact:'medium',outcome:'double',hand:'L'});
 assert.ok(r.points[2].x<0);assert.equal(r.points[2].x,-l.points[2].x);
});
test('animation can be skipped and clamps time without changing outcomes',()=>{
 const f=describeFlight({zone:'UL',contact:'soft',outcome:'single',durationMs:2200});
 assert.deepEqual(atTime(f,-50),{x:0,y:0,done:false});
 assert.equal(atTime(f,2200).done,true);
 assert.equal(atTime(f,9000).done,true);
 assert.equal(f.outcome,'single');
 assert.equal(f.basesEarned,1);
});
test('invalid entries rejected before any path is returned',()=>{
 for(const props of [{zone:'INVALID'},{contact:'unknown'},{outcome:'walk'},{hand:'X'}]){
   assert.throws(()=>describeFlight({zone:'MC',contact:'hard',outcome:'out',...props}));
 }
});

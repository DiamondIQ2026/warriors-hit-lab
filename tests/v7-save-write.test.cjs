'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {encode,decode,selectSlots}=require('../v7/save-envelope.cjs');
const {writeExistingSave}=require('../v7/save-write.cjs');
function fixture(entries,options={}){
 const writes=[];
 const storage={
  getItem(k){return Object.hasOwn(entries,k)?entries[k]:null;},
  setItem(k,v){writes.push(k);if(options.throwWrite){entries[k]=v.slice(0,-7);throw Error('interrupted');}
   if(!options.dropWrite)entries[k]=v;},
  removeItem(){throw Error('Unexpected deletion');},clear(){throw Error('Unexpected clear');}
 };
 return {storage,writes,entries};
}
const slot=(id,seq,payload={player:'Maddon'})=>['whl7:slot:'+id,encode(payload,{seq})];
test('writes only inactive slot, preserves last valid slot and legacy save',()=>{
 const a=slot('a',4),legacy='LEGACY CAREER MUST STAY';
 const entries=Object.fromEntries([a,['warriors-hit-lab-v4',legacy]]);
 const before=entries[a[0]],f=fixture(entries);
 const out=writeExistingSave(f.storage,{player:'Maddon',reps:21},{expectedSeq:4});
 assert.deepEqual(out,{status:'SAVED',slot:'b',seq:5});
 assert.deepEqual(f.writes,['whl7:slot:b']);
 assert.equal(entries[a[0]],before);
 assert.equal(entries['warriors-hit-lab-v4'],legacy);
 assert.equal(decode(entries['whl7:slot:b']).seq,5);
 assert.deepEqual(selectSlots(f.storage).payload,{player:'Maddon',reps:21});
});
test('alternates to slot a when slot b is active',()=>{
 const entries=Object.fromEntries([slot('a',5),slot('b',6)]);
 const previous=entries['whl7:slot:b'],f=fixture(entries);
 assert.deepEqual(writeExistingSave(f.storage,{reps:7},{expectedSeq:6}),
  {status:'SAVED',slot:'a',seq:7});
 assert.deepEqual(f.writes,['whl7:slot:a']);
 assert.equal(entries['whl7:slot:b'],previous);
});
test('stale sequence is rejected without writing',()=>{
 const f=fixture(Object.fromEntries([slot('a',7)]));
 assert.equal(writeExistingSave(f.storage,{reps:8},{expectedSeq:6}).status,'CONFLICT');
 assert.equal(f.writes.length,0);
});
test('corrupt inactive slot blocks writes until explicit recovery',()=>{
 const f=fixture({...Object.fromEntries([slot('a',8)]),'whl7:slot:b':'{broken'});
 const out=writeExistingSave(f.storage,{reps:9},{expectedSeq:8});
 assert.equal(out.status,'BLOCKED');assert.equal(out.readerStatus,'FALLBACK');
 assert.deepEqual(f.writes,[]);
});
test('future schema in either slot blocks downgrade or overwrite',()=>{
 const future=JSON.parse(encode({reps:100},{seq:9}));future.schemaVersion=99;
 const f=fixture({...Object.fromEntries([slot('a',8)]),'whl7:slot:b':JSON.stringify(future)});
 const out=writeExistingSave(f.storage,{reps:10},{expectedSeq:8});
 assert.equal(out.status,'BLOCKED');assert.equal(out.readerStatus,'FUTURE');
 assert.deepEqual(f.writes,[]);
});
test('divergent equal-sequence slots block writes',()=>{
 const f=fixture(Object.fromEntries([slot('a',3,{v:'A'}),slot('b',3,{v:'B'})]));
 assert.equal(writeExistingSave(f.storage,{v:'C'},{expectedSeq:3}).readerStatus,'CONFLICT');
 assert.deepEqual(f.writes,[]);
});
test('interrupted write never removes last valid slot',()=>{
 const entries=Object.fromEntries([slot('a',10)]),original=entries['whl7:slot:a'];
 const f=fixture(entries,{throwWrite:true});
 const out=writeExistingSave(f.storage,{reps:11},{expectedSeq:10});
 assert.equal(out.status,'WRITE_FAILED');
 assert.equal(entries['whl7:slot:a'],original);
 assert.equal(selectSlots(f.storage).slot,'a');
 assert.deepEqual(f.writes,['whl7:slot:b']);
});
test('silent storage write failure is detected by read-back',()=>{
 const f=fixture(Object.fromEntries([slot('a',11)]),{dropWrite:true});
 const out=writeExistingSave(f.storage,{reps:12},{expectedSeq:11});
 assert.equal(out.status,'VERIFY_FAILED');
 assert.equal(selectSlots(f.storage).seq,11);
});
test('invalid payload does not write',()=>{
 const f=fixture(Object.fromEntries([slot('a',1)]));
 assert.equal(writeExistingSave(f.storage,['not an object'],{expectedSeq:1}).status,'INVALID_PAYLOAD');
 assert.deepEqual(f.writes,[]);
});
test('empty slots do not bootstrap or migrate implicitly',()=>{
 const f=fixture({'warriors-hit-lab-v4':'LEGACY SENTINEL'});
 assert.equal(writeExistingSave(f.storage,{reps:1},{expectedSeq:1}).readerStatus,'EMPTY');
 assert.deepEqual(f.writes,[]);
 assert.equal(f.entries['warriors-hit-lab-v4'],'LEGACY SENTINEL');
});
test('unavailable storage and invalid sequence are rejected',()=>{
 assert.equal(writeExistingSave(null,{reps:1},{expectedSeq:1}).status,'UNAVAILABLE');
 const f=fixture(Object.fromEntries([slot('a',1)]));
 assert.equal(writeExistingSave(f.storage,{reps:2},{expectedSeq:Number.MAX_SAFE_INTEGER}).status,'INVALID_EXPECTATION');
 assert.deepEqual(f.writes,[]);
});
test('storage changed between reads is rejected before writing',()=>{
 const entries=Object.fromEntries([slot('a',4)]);
 let reads=0;const f=fixture(entries);
 const originalGet=f.storage.getItem;
 f.storage.getItem=k=>{
  reads++;
  if(reads===3)entries['whl7:slot:a']=encode({changed:true},{seq:5});
  return originalGet(k);
 };
 const out=writeExistingSave(f.storage,{reps:5},{expectedSeq:4});
 assert.equal(out.status,'CONFLICT');
 assert.deepEqual(f.writes,[]);
});

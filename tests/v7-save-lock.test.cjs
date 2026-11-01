'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {encode,selectSlots}=require('../v7/save-envelope.cjs');
const {LOCK_NAME,writeExistingSaveLocked}=require('../v7/save-lock.cjs');

function memory(){
 const data={'whl7:slot:a':encode({writer:'initial'},{seq:1}),
   'warriors-hit-lab-v4':'KEEP V6.3'};
 const writes=[];
 const storage={
  getItem(key){return Object.hasOwn(data,key)?data[key]:null;},
  setItem(key,value){writes.push(key);data[key]=value;}
 };
 return {data,writes,storage};
}
function fakeLocks(){
 let busy=false;
 const requests=[];
 return {
  requests,
  async request(name,options,callback){
   requests.push({name,options});
   if(busy)return callback(null);
   busy=true;
   try{return await callback({name});}finally{busy=false;}
  }
 };
}

test('unavailable Web Locks fail closed without touching V7 or V6.3 saves',async()=>{
 const f=memory();
 for(const locks of [null,{}, {request:null}]){
  assert.deepEqual(await writeExistingSaveLocked(locks,f.storage,{writer:'A'},{expectedSeq:1}),
   {status:'LOCK_UNAVAILABLE'});
 }
 assert.deepEqual(f.writes,[]);
 assert.equal(f.data['warriors-hit-lab-v4'],'KEEP V6.3');
});

test('one granted lock writes exactly one inactive V7 slot and preserves legacy',async()=>{
 const f=memory(),locks=fakeLocks();
 const result=await writeExistingSaveLocked(locks,f.storage,{writer:'A'},{expectedSeq:1});
 assert.deepEqual(result,{status:'SAVED',slot:'b',seq:2});
 assert.deepEqual(locks.requests,[{name:LOCK_NAME,options:{mode:'exclusive',ifAvailable:true}}]);
 assert.deepEqual(f.writes,['whl7:slot:b']);
 assert.equal(selectSlots(f.storage).payload.writer,'A');
 assert.equal(f.data['warriors-hit-lab-v4'],'KEEP V6.3');
});

test('simultaneous competing writer cannot overwrite a held lock',async()=>{
 const f=memory(),locks=fakeLocks();
 let competing;
 const originalSet=f.storage.setItem;
 f.storage.setItem=(key,value)=>{
  // This models a second tab entering while the first has acquired the lock.
  competing=writeExistingSaveLocked(locks,f.storage,{writer:'B'},{expectedSeq:1});
  originalSet(key,value);
 };
 const first=await writeExistingSaveLocked(locks,f.storage,{writer:'A'},{expectedSeq:1});
 const second=await competing;
 assert.equal(first.status,'SAVED');
 assert.deepEqual(second,{status:'LOCK_BUSY'});
 assert.deepEqual(f.writes,['whl7:slot:b']);
 assert.equal(selectSlots(f.storage).payload.writer,'A');
 assert.equal(f.data['warriors-hit-lab-v4'],'KEEP V6.3');
});

test('stale tab cannot write after lock becomes available',async()=>{
 const f=memory(),locks=fakeLocks();
 assert.equal((await writeExistingSaveLocked(locks,f.storage,{writer:'A'},{expectedSeq:1})).status,'SAVED');
 const stale=await writeExistingSaveLocked(locks,f.storage,{writer:'B'},{expectedSeq:1});
 assert.equal(stale.status,'CONFLICT');
 assert.deepEqual(f.writes,['whl7:slot:b']);
 assert.equal(selectSlots(f.storage).payload.writer,'A');
});

test('null lock grant and rejecting lock manager fail closed',async()=>{
 const f=memory();
 assert.deepEqual(await writeExistingSaveLocked({request:async (_n,_o,cb)=>cb(null)},f.storage,{},
  {expectedSeq:1}),{status:'LOCK_BUSY'});
 assert.deepEqual(await writeExistingSaveLocked({request:async()=>{throw Error('SecurityError');}},
  f.storage,{}, {expectedSeq:1}),{status:'LOCK_ERROR'});
 assert.deepEqual(await writeExistingSaveLocked({request:async()=>undefined},f.storage,{},
  {expectedSeq:1}),{status:'LOCK_ERROR'});
 assert.deepEqual(f.writes,[]);
});

test('lock does not override existing writer validation and safety checks',async()=>{
 const f=memory(),locks=fakeLocks();
 assert.equal((await writeExistingSaveLocked(locks,f.storage,{writer:'A'},{expectedSeq:0})).status,
  'INVALID_EXPECTATION');
 assert.equal((await writeExistingSaveLocked(locks,f.storage,[],{expectedSeq:1})).status,
  'INVALID_PAYLOAD');
 assert.deepEqual(f.writes,[]);
});

'use strict';
// Characterization-only cross-tab race harness. Demonstrates a known unsafe
// interleaving in the isolated V7 writer. It is NOT a concurrency fix.
// Never uses global localStorage, live saves, or legacy storage writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {encode,selectSlots}=require('../v7/save-envelope.cjs');
const {writeExistingSave}=require('../v7/save-write.cjs');

test('simulated simultaneous tabs can both report SAVED while one update is lost',()=>{
  const data={'whl7:slot:a':encode({writer:'initial'},{seq:1}),
    'warriors-hit-lab-v4':'LEGACY MUST NOT CHANGE'};
  const writes=[];
  let nestedResult, injected=false;
  const storage={
    getItem(key){return Object.hasOwn(data,key)?data[key]:null;},
    setItem(key,value){
      assert.match(key,/^whl7:slot:[ab]$/);
      // Tab A has finished its preflight, but not committed its write.
      // Tab B runs to completion against the same old sequence.
      if(!injected){
        injected=true;
        nestedResult=writeExistingSave(storage,{writer:'tab-B'},{expectedSeq:1});
      }
      writes.push(key);
      data[key]=value;
    }
  };
  const outerResult=writeExistingSave(storage,{writer:'tab-A'},{expectedSeq:1});
  const final=selectSlots(storage);
  // These assertions document the current unsafe behavior; they must change
  // when a browser-wide atomic lock or transactional writer is implemented.
  assert.equal(nestedResult.status,'SAVED');
  assert.equal(outerResult.status,'SAVED');
  assert.equal(final.status,'OK');
  assert.equal(final.seq,2);
  assert.equal(final.payload.writer,'tab-A');
  assert.deepEqual(writes,['whl7:slot:b','whl7:slot:b']);
  assert.equal(data['warriors-hit-lab-v4'],'LEGACY MUST NOT CHANGE');
});

test('sequential stale tab is rejected without a second write',()=>{
  const data={'whl7:slot:a':encode({writer:'initial'},{seq:1})};
  const writes=[];
  const storage={
    getItem(key){return Object.hasOwn(data,key)?data[key]:null;},
    setItem(key,value){writes.push(key);data[key]=value;}
  };
  assert.equal(writeExistingSave(storage,{writer:'tab-A'},{expectedSeq:1}).status,'SAVED');
  assert.equal(writeExistingSave(storage,{writer:'tab-B'},{expectedSeq:1}).status,'CONFLICT');
  assert.deepEqual(writes,['whl7:slot:b']);
  assert.equal(selectSlots(storage).payload.writer,'tab-A');
});

test.todo('cross-tab atomicity gate: second simultaneous writer must fail without lost update');

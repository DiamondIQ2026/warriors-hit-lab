'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {encode,decode,selectSlots,checksum}=require('../v7/save-envelope.cjs');
const memory=(entries={})=>({getItem:k=>Object.hasOwn(entries,k)?entries[k]:null,setItem:()=>{throw Error('Read-only inspector must not write');}});
test('byte-accurate non-ASCII roundtrip, checksum and sequence',()=>{
 const payload={player:'Maddon ⚾',team:'Warriors',stats:{swings:3500}};
 const raw=encode(payload,{seq:7,savedAt:'2026-11-01T12:00:00Z'});
 const result=decode(raw);
 assert.equal(result.status,'OK');assert.equal(result.seq,7);
 assert.deepEqual(result.payload,payload);
 assert.match(checksum('⚾'),/^fnv1a32:[a-f0-9]{8}$/);
 assert.equal(result.envelope.bytes,Buffer.byteLength(JSON.stringify(payload),'utf8'));
});
test('tampered checksum and truncated envelope fail closed',()=>{
 const raw=encode({player:'Dad'},{seq:1});
 const altered=JSON.parse(raw);altered.payloadJson='{"player":"Bad"}';
 assert.equal(decode(JSON.stringify(altered)).status,'CORRUPT');
 assert.equal(decode(raw.slice(0,-3)).status,'CORRUPT');
});
test('future versions are read only and distinctly identified',()=>{
 const obj=JSON.parse(encode({player:'Dad'},{seq:3}));obj.schemaVersion=99;
 assert.equal(decode(JSON.stringify(obj)).status,'FUTURE');
 obj.schemaVersion=4;assert.equal(decode(JSON.stringify(obj)).status,'UNSUPPORTED');
});
test('invalid seq, metadata or payload fails validation',()=>{
 assert.throws(()=>encode({},{}));
 assert.throws(()=>encode({},{seq:0}));
 const obj=JSON.parse(encode({player:'Dad'},{seq:1}));obj.seq='2';
 assert.equal(decode(JSON.stringify(obj)).status,'INVALID');
 assert.equal(decode('null').status,'INVALID');
});
test('selects newest valid slot without writes',()=>{
 const a=encode({v:'old'},{seq:1}),b=encode({v:'new'},{seq:2});
 const out=selectSlots(memory({'whl7:slot:a':a,'whl7:slot:b':b,'warriors-hit-lab-v4':'real save untouched'}));
 assert.equal(out.status,'OK');assert.equal(out.slot,'b');assert.deepEqual(out.payload,{v:'new'});
});
test('bad newer slot falls back to previous validated slot',()=>{
 const a=encode({v:'safe'},{seq:4});
 const out=selectSlots(memory({'whl7:slot:a':a,'whl7:slot:b':'{broken'}));
 assert.equal(out.status,'FALLBACK');assert.equal(out.slot,'a');assert.equal(out.failures.length,1);
});
test('two corrupt slots require recovery; no empty replacement',()=>{
 const out=selectSlots(memory({'whl7:slot:a':'bad','whl7:slot:b':'worse'}));
 assert.equal(out.status,'RECOVERY');assert.equal(out.payload,undefined);
});
test('future save with no valid alternative stays read only',()=>{
 const x=JSON.parse(encode({v:'future'},{seq:2}));x.schemaVersion=6;
 assert.equal(selectSlots(memory({'whl7:slot:a':JSON.stringify(x)})).status,'FUTURE');
});
test('empty storage is empty, not an automatically written save',()=>assert.equal(selectSlots(memory()).status,'EMPTY'));

test('fault injection: interrupted newer slot falls back without touching stored bytes',()=>{
 const old=encode({career:{hits:18},player:'Maddon'},{seq:8});
 const partial=encode({career:{hits:19}},{seq:9}).slice(0,-11);
 const entries={'whl7:slot:a':old,'whl7:slot:b':partial,'warriors-hit-lab-v4':'LEGACY SENTINEL'};
 const before=JSON.stringify(entries);
 const reads=[];
 const storage={
  getItem(key){reads.push(key);return Object.hasOwn(entries,key)?entries[key]:null;},
  setItem(){throw Error('unexpected write');},
  removeItem(){throw Error('unexpected delete');},
  clear(){throw Error('unexpected clear');}
 };
 const selected=selectSlots(storage);
 assert.equal(selected.status,'FALLBACK');
 assert.equal(selected.slot,'a');
 assert.equal(selected.seq,8);
 assert.deepEqual(selected.payload,{career:{hits:18},player:'Maddon'});
 assert.equal(selected.failures[0].result.status,'CORRUPT');
 assert.deepEqual(reads,['whl7:slot:a','whl7:slot:b']);
 assert.equal(JSON.stringify(entries),before);
});

test('fault injection: byte length corruption is rejected independently of checksum',()=>{
 const obj=JSON.parse(encode({player:'Maddon ⚾'},{seq:1}));
 obj.bytes+=1;
 assert.equal(decode(JSON.stringify(obj)).status,'CORRUPT');
});

test('fault injection: checksum-valid but syntactically invalid payload is rejected',()=>{
 const obj=JSON.parse(encode({player:'Dad'},{seq:1}));
 obj.payloadJson='{broken';
 obj.bytes=Buffer.byteLength(obj.payloadJson,'utf8');
 obj.checksum=checksum(obj.payloadJson);
 assert.equal(decode(JSON.stringify(obj)).status,'CORRUPT');
});

test('fault injection: checksum-valid array payload is not accepted as a save object',()=>{
 const obj=JSON.parse(encode({player:'Dad'},{seq:1}));
 obj.payloadJson='[1,2,3]';
 obj.bytes=Buffer.byteLength(obj.payloadJson,'utf8');
 obj.checksum=checksum(obj.payloadJson);
 assert.equal(decode(JSON.stringify(obj)).status,'INVALID');
});

test('fault injection: invalid timestamp fails closed',()=>{
 const obj=JSON.parse(encode({player:'Dad'},{seq:1}));
 obj.savedAt='not-a-date';
 assert.equal(decode(JSON.stringify(obj)).status,'INVALID');
});

test('fault injection: adapter read exception is surfaced, never silently replaced by empty save',()=>{
 const storage={getItem(){throw Error('storage blocked');},setItem(){throw Error('write forbidden');}};
 assert.equal(selectSlots(storage).status,'STORAGE_UNAVAILABLE');
});

test('fault injection: two future-schema slots require read-only upgrade path',()=>{
 const future=JSON.parse(encode({career:{hits:42}},{seq:12}));
 future.schemaVersion=99;
 const entries={'whl7:slot:a':JSON.stringify(future),'whl7:slot:b':'{truncated'};
 const original=JSON.stringify(entries);
 const out=selectSlots(memory(entries));
 assert.equal(out.status,'FUTURE');
 assert.equal(out.payload,undefined);
 assert.equal(JSON.stringify(entries),original);
});

test('future-schema slot blocks older valid slot and exposes no downgrade payload',()=>{
 const future=JSON.parse(encode({v:'future'},{seq:12}));future.schemaVersion=6;
 for(const id of ['a','b']){
  const entries={'whl7:slot:a':encode({v:'old'},{seq:4}),'whl7:slot:b':encode({v:'old'},{seq:4})};
  entries['whl7:slot:'+id]=JSON.stringify(future);
  const out=selectSlots(memory(entries));
  assert.equal(out.status,'FUTURE');assert.equal(out.payload,undefined);
 }
});
test('divergent equal-sequence slots are conflicts independent of slot order',()=>{
 for(const [a,b] of [[{v:'A'},{v:'B'}],[{v:'B'},{v:'A'}]]){
  const out=selectSlots(memory({'whl7:slot:a':encode(a,{seq:8}),
   'whl7:slot:b':encode(b,{seq:8})}));
  assert.equal(out.status,'CONFLICT');assert.equal(out.payload,undefined);
 }
});
test('null adapter and throwing storage fail closed without creating an empty save',()=>{
 assert.equal(selectSlots(null).status,'STORAGE_UNAVAILABLE');
 assert.equal(selectSlots({getItem(){throw new Error('blocked');}}).status,'STORAGE_UNAVAILABLE');
});
test('injected semantic validation rejects invalid newest payload and requires recovery',()=>{
 const entries={'whl7:slot:a':encode({career:{hits:2}},{seq:1}),
  'whl7:slot:b':encode({unexpected:true},{seq:2})};
 const out=selectSlots(memory(entries),p=>Boolean(p.career));
 assert.equal(out.status,'FALLBACK');assert.equal(out.slot,'a');
 assert.equal(out.failures[0].result.reason,'Payload validation failed');
 const none=selectSlots(memory(entries),()=>{throw Error('invalid');});
 assert.equal(none.status,'RECOVERY');assert.equal(none.payload,undefined);
});
test('read-only inspection never invokes mutating storage operations',()=>{
 const entries={'whl7:slot:a':encode({career:true},{seq:1})};
 let writes=0;const storage={getItem:k=>entries[k]??null,
  setItem(){writes++;},removeItem(){writes++;},clear(){writes++;}};
 assert.equal(selectSlots(storage).status,'OK');assert.equal(writes,0);
});

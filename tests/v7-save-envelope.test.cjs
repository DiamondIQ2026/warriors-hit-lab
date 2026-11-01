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

test('future slot blocks older valid slot instead of risking downgrade overwrite',()=>{
 const next=JSON.parse(encode({career:'newer'},{seq:9}));next.schemaVersion=6;
 const out=selectSlots(memory({'whl7:slot:a':encode({career:'old'},{seq:8}),'whl7:slot:b':JSON.stringify(next)}));
 assert.equal(out.status,'FUTURE');assert.equal(out.payload,undefined);
});
test('identical sequence with different payloads is a conflict',()=>{
 const out=selectSlots(memory({'whl7:slot:a':encode({career:'a'},{seq:3}),
  'whl7:slot:b':encode({career:'b'},{seq:3})}));
 assert.equal(out.status,'CONFLICT');assert.equal(out.payload,undefined);
});
test('storage exceptions are unavailable rather than empty',()=>{
 assert.equal(selectSlots(null).status,'UNAVAILABLE');
 assert.equal(selectSlots({getItem(){throw Error('blocked')}}).status,'UNAVAILABLE');
});
test('application validator can reject intact but unopenable saves',()=>{
 const out=selectSlots(memory({'whl7:slot:a':encode({},{seq:9}),
  'whl7:slot:b':encode({player:'Dad'},{seq:8})}),p=>typeof p.player==='string');
 assert.equal(out.status,'FALLBACK');assert.equal(out.slot,'b');
});
test('unsupported schemas and malformed payloads are distinct from corruption',()=>{
 const old=JSON.parse(encode({player:'Dad'},{seq:1}));old.schemaVersion=4;
 assert.equal(selectSlots(memory({'whl7:slot:a':JSON.stringify(old)})).status,'UNSUPPORTED');
 assert.equal(selectSlots(memory({'whl7:slot:a':JSON.stringify({format:'warriors-hit-lab',schemaVersion:5})})).status,'INVALID');
});

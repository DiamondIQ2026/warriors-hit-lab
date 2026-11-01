'use strict';
// Pure V7 save envelope codec. Does not access localStorage, production saves, DOM or networking.
// FNV-1a is an accidental-corruption checksum, NOT a cryptographic authenticity mechanism.
const FORMAT='warriors-hit-lab', SCHEMA=5, PREFIX='whl7:';
const utf8Length=s=>typeof Buffer!=='undefined'?Buffer.byteLength(s,'utf8'):new TextEncoder().encode(s).length;
function checksum(s){
 let n=0x811c9dc5;
 const bytes=typeof Buffer!=='undefined'?Buffer.from(s,'utf8'):new TextEncoder().encode(s);
 for(const byte of bytes){n=Math.imul(n^byte,0x01000193)>>>0;}
 return 'fnv1a32:'+n.toString(16).padStart(8,'0');
}
function encode(payload,{seq,appVersion='7-dev',savedAt='2026-11-01T00:00:00.000Z'}={}){
 if(!Number.isSafeInteger(seq)||seq<1)throw Error('Invalid sequence');
 if(!appVersion||typeof appVersion!=='string'||!Number.isFinite(Date.parse(savedAt)))throw Error('Invalid metadata');
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid payload');
 const payloadJson=JSON.stringify(payload);
 if(typeof payloadJson!=='string')throw Error('Payload cannot be encoded');
 return JSON.stringify({format:FORMAT,schemaVersion:SCHEMA,appVersion,seq,savedAt,
  payloadJson,bytes:utf8Length(payloadJson),checksum:checksum(payloadJson)});
}
function decode(raw){
 let envelope;
 try{envelope=JSON.parse(raw);}catch{return {status:'CORRUPT',reason:'Envelope is not JSON'};}
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))return {status:'INVALID',reason:'Envelope is not an object'};
 if(envelope.format!==FORMAT)return {status:'INVALID',reason:'Wrong format'};
 if(!Number.isSafeInteger(envelope.schemaVersion))return {status:'INVALID',reason:'Missing schema version'};
 if(envelope.schemaVersion>SCHEMA)return {status:'FUTURE',reason:'Newer schema'};
 if(envelope.schemaVersion!==SCHEMA)return {status:'UNSUPPORTED',reason:'Unsupported schema'};
 if(!Number.isSafeInteger(envelope.seq)||envelope.seq<1||typeof envelope.payloadJson!=='string'||
    !Number.isSafeInteger(envelope.bytes)||envelope.bytes<0||typeof envelope.checksum!=='string'||
    typeof envelope.appVersion!=='string'||!Number.isFinite(Date.parse(envelope.savedAt)))return {status:'INVALID',reason:'Invalid envelope metadata'};
 if(utf8Length(envelope.payloadJson)!==envelope.bytes||checksum(envelope.payloadJson)!==envelope.checksum)
  return {status:'CORRUPT',reason:'Checksum or byte length mismatch'};
 let payload;
 try{payload=JSON.parse(envelope.payloadJson);}catch{return {status:'CORRUPT',reason:'Invalid payload JSON'};}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return {status:'INVALID',reason:'Invalid payload'};
 return {status:'OK',seq:envelope.seq,payload,envelope};
}
function selectSlots(storage){
 // Read-only inspection. Never modifies the provided adapter or any storage key.
 const slots=['a','b'].map(id=>{
  const raw=storage.getItem(PREFIX+'slot:'+id);
  return {id,present:raw!==null,result:raw===null?null:decode(raw)};
 });
 const valid=slots.filter(s=>s.result?.status==='OK').sort((a,b)=>b.result.seq-a.result.seq);
 if(valid.length){
  const failures=slots.filter(s=>s.present&&s.result.status!=='OK');
  return {status:failures.length?'FALLBACK':'OK',slot:valid[0].id,seq:valid[0].result.seq,
    payload:valid[0].result.payload,failures};
 }
 if(slots.some(s=>s.result?.status==='FUTURE'))return {status:'FUTURE',failures:slots.filter(s=>s.present)};
 if(slots.some(s=>s.present))return {status:'RECOVERY',failures:slots.filter(s=>s.present)};
 return {status:'EMPTY',failures:[]};
}
module.exports={FORMAT,SCHEMA,PREFIX,checksum,encode,decode,selectSlots};

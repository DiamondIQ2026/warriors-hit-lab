'use strict';
// Isolated V7-only writer. Never accesses global localStorage or legacy V6.3 keys.
// Deliberately refuses initial migration, fallback/recovery and future-version slots.
// A browser-wide atomic lock is NOT provided: cross-tab concurrency requires a later gate.
const {PREFIX,encode,selectSlots}=require('./save-envelope.cjs');

function writeExistingSave(storage,payload,{expectedSeq,validatePayload,savedAt,appVersion}={}){
 if(!Number.isSafeInteger(expectedSeq)||expectedSeq<1||expectedSeq>=Number.MAX_SAFE_INTEGER)
  return {status:'INVALID_EXPECTATION'};
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')
  return {status:'UNAVAILABLE'};
 const inspect=()=>selectSlots(storage,validatePayload);
 const current=inspect();
 // Only write when a healthy existing V7 slot is known. No implicit V6.3 import.
 if(current.status!=='OK')return {status:'BLOCKED',readerStatus:current.status};
 if(current.seq!==expectedSeq)return {status:'CONFLICT',observedSeq:current.seq};
 const activeKey=PREFIX+'slot:'+current.slot;
 const targetSlot=current.slot==='a'?'b':'a';
 const targetKey=PREFIX+'slot:'+targetSlot;
 let activeRaw;
 try{activeRaw=storage.getItem(activeKey);}catch{return {status:'UNAVAILABLE'};}
 const fresh=inspect();
 if(fresh.status!=='OK'||fresh.seq!==expectedSeq||fresh.slot!==current.slot)
  return {status:'CONFLICT',readerStatus:fresh.status};
 try{if(storage.getItem(activeKey)!==activeRaw)return {status:'CONFLICT'};}
 catch{return {status:'UNAVAILABLE'};}
 let encoded;
 try{encoded=encode(payload,{seq:expectedSeq+1,
  ...(savedAt===undefined?{savedAt:new Date().toISOString()}:{savedAt}),
  ...(appVersion===undefined?{}:{appVersion})});}
 catch{return {status:'INVALID_PAYLOAD'};}
 // Exactly one write to the inactive V7 slot. Never delete or modify the active slot.
 try{storage.setItem(targetKey,encoded);}
 catch{return {status:'WRITE_FAILED',preservedSlot:current.slot};}
 try{
  if(storage.getItem(targetKey)!==encoded)return {status:'VERIFY_FAILED',preservedSlot:current.slot};
  const verified=inspect();
  if(verified.status!=='OK'||verified.seq!==expectedSeq+1||verified.slot!==targetSlot)
   return {status:'VERIFY_FAILED',preservedSlot:current.slot};
 }catch{return {status:'VERIFY_FAILED',preservedSlot:current.slot};}
 return {status:'SAVED',slot:targetSlot,seq:expectedSeq+1};
}
module.exports={writeExistingSave};

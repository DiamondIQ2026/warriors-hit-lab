'use strict';
// Experimental V7-only, fail-closed Web Locks adapter. NOT wired to live gameplay.
// All cooperating tabs on the same origin must use this gate; it cannot prevent
// writes from other code paths or guarantee durable storage after a browser crash.
const {writeExistingSave}=require('./save-write.cjs');
const LOCK_NAME='whl7:save-write:exclusive:v1';

async function writeExistingSaveLocked(locks,storage,payload,options){
 if(!locks||typeof locks.request!=='function')return {status:'LOCK_UNAVAILABLE'};
 try{
  const result=await locks.request(LOCK_NAME,{mode:'exclusive',ifAvailable:true},lock=>{
   if(!lock)return {status:'LOCK_BUSY'};
   return writeExistingSave(storage,payload,options);
  });
  // Do not interpret an unexpected adapter response as a successful write.
  if(!result||typeof result!=='object'||typeof result.status!=='string')
   return {status:'LOCK_ERROR'};
  return result;
 }catch{return {status:'LOCK_ERROR'};}
}
module.exports={LOCK_NAME,writeExistingSaveLocked};

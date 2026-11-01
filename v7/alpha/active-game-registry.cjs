'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HitLabActiveRegistry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const KEYS=Object.freeze({cpu:'hitlab-v7-visual-prototype-only',rivalry:'warriors-hit-lab-v7-multiplayer-prototype'});
 function inspect(storage,mode){
  if(!Object.prototype.hasOwnProperty.call(KEYS,mode))throw Error('Unknown game mode');
  let raw;
  try{raw=storage.getItem(KEYS[mode]);}
  catch{return {mode,status:'unavailable'};}
  if(raw===null)return {mode,status:'empty'};
  let value;
  try{value=JSON.parse(raw);}catch{return {mode,status:'invalid'};}
  if(!value||typeof value!=='object'||Array.isArray(value))return {mode,status:'invalid'};
  if(mode==='rivalry'){
   if(value.version!==1||!value.home||!value.away||!Array.isArray(value.atBats)||!Array.isArray(value.bases))return {mode,status:'invalid'};
   return {mode,status:value.status==='active'?'resumable':value.status==='final'?'finished':'invalid'};
  }
  if(value.gameFinished===true)return {mode,status:'finished'};
  // A visible in-progress flag is stronger than training repetitions,
  // which may exist without a running game.
  if(value.gameStarted===true&&Number.isInteger(value.inning)&&value.inning>=1&&value.inning<=1000)return {mode,status:'resumable'};
  return {mode,status:'not-confirmed'};
 }
 function scan(storage){return [inspect(storage,'cpu'),inspect(storage,'rivalry')];}
 return Object.freeze({KEYS,inspect,scan});
});
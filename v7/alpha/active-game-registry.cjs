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
 function snapshot(storage,mode){
  const entry=inspect(storage,mode);
  if(entry.status!=='resumable')return {mode,status:entry.status,snapshot:null};
  let value;
  try{value=JSON.parse(storage.getItem(KEYS[mode]));}
  catch{return {mode,status:'unavailable',snapshot:null};}
  if(mode==='cpu'){
   if(![value.inning,value.outs,value.away,value.home].every(Number.isInteger) ||
      value.inning<1||value.outs<0||value.outs>2||value.away<0||value.home<0 ||
      !Array.isArray(value.bases)||value.bases.length!==3||
      !value.bases.every(x=>typeof x==='boolean'))
     return {mode,status:'invalid',snapshot:null};
   return {mode,status:'resumable',snapshot:{inning:value.inning,outs:value.outs,away:value.away,home:value.home,bases:[...value.bases]}};
  }
  if(!Number.isInteger(value.inning)||value.inning<1||!Number.isInteger(value.outs)||value.outs<0||value.outs>2||
     !['top','bottom'].includes(value.half)||!value.score||!value.battingOrder||
     !value.home?.id||!value.away?.id||value.home.id===value.away.id||
     ![value.score[value.home.id],value.score[value.away.id],value.battingOrder[value.home.id],value.battingOrder[value.away.id]].every(x=>Number.isInteger(x)&&x>=0)||
     value.bases.length!==3||!value.bases.every(x=>typeof x==='boolean'))
    return {mode,status:'invalid',snapshot:null};
  return {mode,status:'resumable',snapshot:{inning:value.inning,half:value.half,outs:value.outs,
    home:value.score[value.home.id],away:value.score[value.away.id],
    battingOrder:{home:value.battingOrder[value.home.id],away:value.battingOrder[value.away.id]},bases:[...value.bases]}};
 }
 function scan(storage){return [inspect(storage,'cpu'),inspect(storage,'rivalry')];}
 return Object.freeze({KEYS,inspect,scan,snapshot});
});
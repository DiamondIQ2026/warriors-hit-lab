'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HitLabGameState=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function int(v,min,max=Number.MAX_SAFE_INTEGER){return Number.isSafeInteger(v)&&v>=min&&v<=max;}
 function bases(v){return Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='boolean');}
 function normalize(mode,raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Missing game state');
  if(mode==='cpu'){
   if(raw.gameStarted!==true||raw.gameFinished===true||!int(raw.inning,1,1000)||
      !int(raw.outs,0,2)||!int(raw.home,0)||!int(raw.away,0)||!bases(raw.bases))
    throw Error('Invalid active CPU game');
   return Object.freeze({mode:'cpu',inning:raw.inning,half:'bottom',outs:raw.outs,
     home:raw.home,away:raw.away,bases:[...raw.bases],battingOrder:null,status:'active'});
  }
  if(mode==='rivalry'){
   const h=raw.home?.id,a=raw.away?.id;
   if(raw.version!==1||raw.status!=='active'||!h||!a||h===a||
      !int(raw.inning,1,1000)||!['top','bottom'].includes(raw.half)||!int(raw.outs,0,2)||
      !int(raw.score?.[h],0)||!int(raw.score?.[a],0)||
      !int(raw.battingOrder?.[h],0,8)||!int(raw.battingOrder?.[a],0,8)||!bases(raw.bases))
    throw Error('Invalid active rivalry game');
   return Object.freeze({mode:'rivalry',inning:raw.inning,half:raw.half,outs:raw.outs,
    home:raw.score[h],away:raw.score[a],bases:[...raw.bases],
    battingOrder:Object.freeze({home:raw.battingOrder[h],away:raw.battingOrder[a]}),status:'active'});
  }
  throw Error('Unsupported game mode');
 }
 return Object.freeze({normalize});
});
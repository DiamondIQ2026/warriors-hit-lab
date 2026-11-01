'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HitLabFinishRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function decision({inning,scheduled,half,home,away,thirdOut=false}){
  if(![inning,scheduled,home,away].every(Number.isSafeInteger)||inning<1||scheduled<1||home<0||away<0||!['top','bottom'].includes(half)||typeof thirdOut!=='boolean')throw Error('Invalid game completion input');
  if(half==='bottom'&&inning>=scheduled&&home>away)return Object.freeze({kind:'final',winner:'home',reason:'walkoff'});
  if(!thirdOut)return Object.freeze({kind:'continue'});
  if(half==='top'){
   if(inning>=scheduled&&home>away)return Object.freeze({kind:'final',winner:'home',reason:'home-lead'});
   return Object.freeze({kind:'handoff',half:'bottom',inning});
  }
  if(inning>=scheduled&&home!==away)return Object.freeze({kind:'final',winner:home>away?'home':'away',reason:'completed'});
  return Object.freeze({kind:'next-inning',inning:inning+1,extra:inning>=scheduled});
 }
 return Object.freeze({decision});
});
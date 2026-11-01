'use strict';
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./unified-game-state.cjs'):root.HitLabGameState);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HitLabTransition=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(stateApi){
 function observe(mode,before,after){
  const first=stateApi.normalize(mode,before);
  const next=stateApi.normalize(mode,after);
  if(next.inning<first.inning||next.inning>first.inning+1)throw Error('Invalid inning progression');
  if(next.home<first.home||next.away<first.away)throw Error('Scores cannot decrease');
  if(next.inning===first.inning&&next.half===first.half&&next.outs<first.outs)
   throw Error('Outs cannot decrease without a half-inning change');
  if(mode==='rivalry'){
   const changedHalf=next.half!==first.half||next.inning!==first.inning;
   if(changedHalf&&next.outs!==0)throw Error('New half-inning must start at zero outs');
   if(!changedHalf&&next.outs>first.outs+1)throw Error('Cannot add multiple outs in one transition');
  }
  return Object.freeze({mode,from:first,to:next,scoreDelta:Object.freeze({
   home:next.home-first.home,away:next.away-first.away
  }),advancedInning:next.inning>first.inning});
 }
 return Object.freeze({observe});
});
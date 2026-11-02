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
   if(next.inning===first.inning&&first.half==='bottom'&&next.half==='top')
    throw Error('Cannot return to top of the same inning');
   if(next.inning>first.inning&&(first.half!=='bottom'||next.half!=='top'))
    throw Error('Inning can only advance from bottom to next top');
   if(changedHalf&&next.outs!==0)throw Error('New half-inning must start at zero outs');
   if(changedHalf&&next.bases.some(Boolean))throw Error('Runners must clear at a half-inning change');
   if(first.half==='top'&&next.home>first.home)throw Error('Home cannot score during away at-bat');
   if(first.half==='bottom'&&next.away>first.away)throw Error('Away cannot score during home at-bat');
   if(!changedHalf&&next.outs>first.outs+1)throw Error('Cannot add multiple outs in one transition');
  }
  return Object.freeze({mode,from:first,to:next,scoreDelta:Object.freeze({
   home:next.home-first.home,away:next.away-first.away
  }),advancedInning:next.inning>first.inning});
 }
 return Object.freeze({observe});
});
'use strict';
(function(root,factory){
 const transition=typeof module==='object'&&module.exports?require('./game-transition.cjs'):root.HitLabTransition;
 const api=factory(transition);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HitLabExecution=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(transition){
 function execute(mode,current,action){
  if(mode!=='cpu'&&mode!=='rivalry')throw Error('Invalid execution mode');
  if(typeof action!=='function')throw Error('Execution callback required');
  // Preserve the original mode engine as the single authority for outcomes.
  const next=action(current);
  let observation=null,warning=null;
  if(next&&current&&next.status!=='final'&&next.gameFinished!==true){
   try{observation=transition.observe(mode,current,next);}catch(e){warning=e.message;}
  }
  return {next,observation,warning};
 }
 return Object.freeze({execute});
});
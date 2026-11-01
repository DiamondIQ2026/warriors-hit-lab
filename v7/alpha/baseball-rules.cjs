'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HitLabBaseRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function advance(bases,n){
  if(!Array.isArray(bases)||bases.length!==3||!bases.every(x=>typeof x==='boolean')||!Number.isInteger(n)||n<1||n>4)throw Error('Invalid base advancement');
  const next=[false,false,false];let runs=n===4?1:0;
  for(let i=2;i>=0;i--)if(bases[i]){if(i+n>=3)runs++;else next[i+n]=true}
  if(n<4)next[n-1]=true;
  return {bases:next,runs};
 }
 function afterThirdOut(){return {outs:0,bases:[false,false,false]};}
 return Object.freeze({advance,afterThirdOut});
});
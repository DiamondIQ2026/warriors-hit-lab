'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HitLabZoneRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const ZONES=Object.freeze(['UL','UC','UR','ML','MC','MR','LL','LC','LR']);
 function number(value){
  if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=9)return value;
  if(typeof value==='string'&&/^[1-9]$/.test(value))return Number(value);
  if(typeof value==='string'){
   const i=ZONES.indexOf(value);
   if(i!==-1)return i+1;
  }
  throw Error('Invalid nine-zone location');
 }
 function label(value){return ZONES[number(value)-1];}
 return Object.freeze({ZONES,number,label});
});
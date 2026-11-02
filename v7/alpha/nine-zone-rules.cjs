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
 // Keyboard navigation follows the physical 3x3 net grid. At an edge,
 // focus stays in place rather than jumping to a different row/column.
 function move(index,key){
  if(!Number.isInteger(index)||index<0||index>=ZONES.length)throw Error('Invalid nine-zone index');
  const directions={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowDown:[1,0],ArrowUp:[-1,0]};
  const step=directions[key];
  if(!step)return index;
  const row=Math.max(0,Math.min(2,Math.floor(index/3)+step[0]));
  const col=Math.max(0,Math.min(2,index%3+step[1]));
  return row*3+col;
 }
 return Object.freeze({ZONES,number,label,move});
});
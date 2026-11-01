'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HitLabAlphaSession=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const KEY='whl7:alpha:navigation-session:v1';
 const ROUTES=Object.freeze({home:'./index.html',cpu:'../experimental/visual-prototype.html',rivalry:'../multiplayer.html'});
 function validMode(mode){return Object.prototype.hasOwnProperty.call(ROUTES,mode);}
 function normalize(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||!validMode(value.mode))throw Error('Invalid alpha navigation session');
  return {version:1,mode:value.mode};
 }
 function read(storage){
  try{
   const raw=storage.getItem(KEY);
   if(raw===null)return {status:'empty',session:null};
   return {status:'ok',session:normalize(JSON.parse(raw))};
  }catch{return {status:'unavailable',session:null};}
 }
 function select(storage,mode){
  if(!validMode(mode))throw Error('Unsupported alpha mode');
  const session={version:1,mode};
  storage.setItem(KEY,JSON.stringify(session));
  return session;
 }
 function destination(mode){if(!validMode(mode))throw Error('Unsupported alpha mode');return ROUTES[mode];}
 return Object.freeze({KEY,read,select,destination});
});
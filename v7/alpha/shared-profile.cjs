'use strict';
/* Alpha-only profile record. Never reads or writes existing match or V6 saves. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HitLabAlphaProfile=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const KEY='whl7:alpha:shared-profile:v1';
  function normalize(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Profile must be an object');
    const name=String(raw.name||'').trim();
    const team=String(raw.team||'').trim();
    const hand=raw.hand;
    if(name.length<1||name.length>24)throw Error('Player name must have 1–24 characters');
    if(team.length<1||team.length>40)throw Error('Team must have 1–40 characters');
    if(hand!=='Left'&&hand!=='Right')throw Error('Choose Left or Right handed');
    return {version:1,name,team,hand};
  }
  function read(storage){
    try{
      const value=storage.getItem(KEY);
      return value===null?{status:'empty',profile:null}:{status:'ok',profile:normalize(JSON.parse(value))};
    }catch(e){return {status:'unavailable',profile:null};}
  }
  function save(storage,raw){
    const profile=normalize(raw);
    storage.setItem(KEY,JSON.stringify(profile));
    return profile;
  }
  return Object.freeze({KEY,normalize,read,save});
});
'use strict';
// Genuine engine-built V7 fixtures: do not fabricate scores/innings without history.
// These keep resume-integrity checks meaningful during endgame browser tests.
const api=require('../../v7/pass-and-play.cjs');
const lineup=prefix=>Array.from({length:9},(_,i)=>prefix+' '+(i+1));
const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R',lineup:lineup('Titan')});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',hand:'R',lineup:lineup('Warrior')});
const hit=(m,outcome='out')=>api.recordSwing(m,{zone:'MC',power:'hard',outcome});
const outs=(m,n=3)=>{for(let i=0;i<n;i++)m=hit(m);return m;};
function matchFixture(scenario){
 let m=api.newMatch(home,away,3);
 if(scenario==='home-leads-top3-two-outs'){
  m=outs(m);m=hit(m,'homer');m=outs(m);
  m=outs(m);m=outs(m);m=outs(m,2);
 }else if(scenario==='away-leads-bottom3-two-outs'){
  m=hit(m,'homer');m=outs(m);m=outs(m);
  m=outs(m);m=outs(m);m=outs(m);m=outs(m,2);
 }else if(scenario==='tied-bottom3-one-out'||scenario==='tied-bottom3-two-outs-runners'){
  for(let i=0;i<2;i++){m=outs(m);m=outs(m);}
  m=outs(m);
  if(scenario==='tied-bottom3-one-out')m=outs(m,1);
  else{m=hit(m,'single');m=hit(m,'double');m=outs(m,2);}
 }else throw Error('Unknown game fixture: '+scenario);
 const validation=api.validateMatch(m);
 if(!validation.ok)throw Error('Fixture invalid: '+validation.reason);
 return m;
}
module.exports={matchFixture};

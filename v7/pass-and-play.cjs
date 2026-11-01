'use strict';
// V7 standalone, deterministic pass-and-play match engine.
// No DOM, storage, production save changes, or random CPU outcomes.
const ZONES=['UL','UC','UR','ML','MC','MR','LL','LC','LR'];
const POWERS=['soft','medium','hard'];
const OUTCOMES=['out','single','double','triple','homer'];
function createProfile({id,name,team,hand='R',lineup}){
 if(!id||!name?.trim()||!team?.trim()||!['L','R'].includes(hand))throw Error('Invalid player profile');
 const names=lineup||Array.from({length:9},(_,i)=>'Batter '+(i+1));
 if(!Array.isArray(names)||names.length!==9||names.some(x=>!String(x).trim()))throw Error('Nine lineup slots required');
 return {id:String(id),name:name.trim(),team:team.trim(),hand,lineup:names.map(String)};
}
function newMatch(home,away,innings=3){
 if(!home||!away||home.id===away.id||home.team.toLowerCase()===away.team.toLowerCase()||![3,6,9].includes(innings))throw Error('Invalid matchup');
 return {version:1,home,away,innings,inning:1,half:'top',outs:0,bases:[false,false,false],score:{[home.id]:0,[away.id]:0},battingOrder:{[home.id]:0,[away.id]:0},atBats:[],realSwings:{[home.id]:0,[away.id]:0},status:'active',winner:null};
}
function offense(m){return m.half==='top'?m.away:m.home}
function scoreRuns(bases,outcome){
 const n={single:1,double:2,triple:3,homer:4}[outcome];
 if(!n)return {bases:[...bases],runs:0};
 const shared=typeof window!=='undefined'&&window.HitLabBaseRules;
 return shared?shared.advance(bases,n):advanceFallback(bases,n);
}
function advanceFallback(bases,n){
 const next=[false,false,false];let runs=n===4?1:0;
 for(let i=2;i>=0;i--)if(bases[i]){if(i+n>=3)runs++;else next[i+n]=true}
 if(n<4)next[n-1]=true;
 return {bases:next,runs};
}
function recordSwing(match,{zone,power,outcome}){
 if(match.status!=='active')throw Error('Match is complete');
 if(!ZONES.includes(zone)||!POWERS.includes(power)||!OUTCOMES.includes(outcome))throw Error('Invalid swing');
 const m=structuredClone(match),player=offense(m),index=m.battingOrder[player.id],batter=player.lineup[index];
 const result=scoreRuns(m.bases,outcome),runs=outcome==='out'?0:result.runs;
 m.realSwings[player.id]++;m.battingOrder[player.id]=(index+1)%9;
 m.atBats.push({teamId:player.id,batter,index,inning:m.inning,half:m.half,zone,power,outcome,runs,kind:'real-swing'});
 if(outcome==='out')m.outs++;else{m.bases=result.bases;m.score[player.id]+=runs}
 if((typeof window!=='undefined'&&window.HitLabFinishRules?window.HitLabFinishRules.decision({inning:m.inning,scheduled:m.innings,half:m.half,home:m.score[m.home.id],away:m.score[m.away.id]}).kind==='final':(m.half==='bottom'&&m.inning>=m.innings&&m.score[m.home.id]>m.score[m.away.id))){
  m.status='final';m.winner=m.home.id;return m;
 }
 if(m.outs===3){
  const shared=typeof window!=='undefined'&&window.HitLabBaseRules;
  const reset=shared?shared.afterThirdOut():{outs:0,bases:[false,false,false]};
  m.outs=reset.outs;m.bases=reset.bases;
  if(m.half==='top'){
   if(m.inning>=m.innings&&m.score[m.home.id]>m.score[m.away.id]){m.status='final';m.winner=m.home.id;}
   else m.half='bottom';
  }else{
   if(m.inning>=m.innings&&m.score[m.home.id]!==m.score[m.away.id]){
    m.status='final';m.winner=m.score[m.home.id]>m.score[m.away.id]?m.home.id:m.away.id;
   }else{m.inning++;m.half='top'}
  }
 }
 return m;
}
function currentTurn(m){return {team:offense(m).team,playerId:offense(m).id,inning:m.inning,half:m.half,outs:m.outs,status:m.status}}
const api={createProfile,newMatch,recordSwing,currentTurn,scoreRuns};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.HitLabMultiplayer=api;

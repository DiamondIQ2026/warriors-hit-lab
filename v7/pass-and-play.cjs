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
// The real tee swing supplies zone/contact; this seeded *game simulation* supplies
// an entertainment outcome. No physical ball-tracking or measured hit is claimed.
// Seed inputs are all already present in the V7 match; no save schema migration.
function resolveSimulatedOutcome(match,{zone,power}){
 if(!match||match.status!=='active'||!ZONES.includes(zone)||!POWERS.includes(power))throw Error('Invalid simulated swing');
 const player=offense(match),index=ZONES.indexOf(zone);
 const row=Math.floor(index/3),col=index%3;
 const centrality=1-(Math.abs(row-1)+Math.abs(col-1))/2;
 const handedSide=(player.hand==='L'&&col===2)||(player.hand==='R'&&col===0);
 const chance=Math.min(.85,({soft:.37,medium:.51,hard:.61}[power])+.16*centrality+(handedSide?.025:0));
 const seed=[player.id,player.hand,zone,power,match.inning,match.half,match.outs,
  match.atBats.length,match.battingOrder[player.id],match.score[player.id],
  match.score[player.id===match.home.id?match.away.id:match.home.id],...match.bases.map(Number)].join('|');
 function unit(salt){
  let h=2166136261;
  for(const ch of seed+'|'+salt)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
  return h/4294967296;
 }
 if(unit('contact')>=chance)return 'out';
 const distance=unit('distance');
 if(power==='soft')return distance<.82?'single':distance<.97?'double':'triple';
 if(power==='medium')return distance<.61?'single':distance<.84?'double':distance<.94?'triple':'homer';
 return distance<.43?'single':distance<.72?'double':distance<.80?'triple':'homer';
}
function recordSwing(match,{zone,power,outcome}){
 if(match.status!=='active')throw Error('Match is complete');
 if(!ZONES.includes(zone)||!POWERS.includes(power)||!OUTCOMES.includes(outcome))throw Error('Invalid swing');
 const m=structuredClone(match),player=offense(m),index=m.battingOrder[player.id],batter=player.lineup[index];
 const result=scoreRuns(m.bases,outcome);
 // In a bottom-of-final-inning walk-off, a non-homer scores only the
 // runs required to win. Home runs are credited in full (including grand slams).
 // Keep the simulated base-advancement result separate from credited runs.
 const earnedRuns=outcome==='out'?0:result.runs;
 const runs=m.half==='bottom'&&m.inning>=m.innings&&outcome!=='homer'&&
  m.score[m.home.id]+earnedRuns>m.score[m.away.id]
  ?Math.min(earnedRuns,Math.max(0,m.score[m.away.id]-m.score[m.home.id]+1))
  :earnedRuns;
 m.realSwings[player.id]++;m.battingOrder[player.id]=(index+1)%9;
 m.atBats.push({teamId:player.id,batter,index,inning:m.inning,half:m.half,zone,power,outcome,runs,kind:'real-swing'});
 if(outcome==='out')m.outs++;else{m.bases=result.bases;m.score[player.id]+=runs}
 const sharedFinish=typeof window!=='undefined'&&window.HitLabFinishRules;
 const walkoff=sharedFinish
  ?sharedFinish.decision({inning:m.inning,scheduled:m.innings,half:m.half,home:m.score[m.home.id],away:m.score[m.away.id]}).reason==='walkoff'
  :(m.half==='bottom'&&m.inning>=m.innings&&m.score[m.home.id]>m.score[m.away.id]);
 if(walkoff){
  m.status='final';m.winner=m.home.id;return m;
 }
 if(m.outs===3){
  const shared=typeof window!=='undefined'&&window.HitLabBaseRules;
  const reset=shared?shared.afterThirdOut():{outs:0,bases:[false,false,false]};
  m.outs=reset.outs;m.bases=reset.bases;
  const rules=typeof window!=='undefined'&&window.HitLabFinishRules;
  const decision=rules?rules.decision({inning:m.inning,scheduled:m.innings,half:m.half,home:m.score[m.home.id],away:m.score[m.away.id],thirdOut:true}):null;
  if(decision){
   if(decision.kind==='final'){m.status='final';m.winner=decision.winner==='home'?m.home.id:m.away.id;}
   else if(decision.kind==='handoff')m.half='bottom';
   else if(decision.kind==='next-inning'){m.inning=decision.inning;m.half='top';}
  }else if(m.half==='top'){
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
// Derive a live box score from authoritative swing history; never persist or
// infer measured ball flight. Runs use the credited play value (walk-off cap).
function boxScore(match){
 const check=validateMatch(match);
 if(!check.ok)throw Error('Invalid match: '+check.reason);
 const ids=[match.away.id,match.home.id];
 const teams=Object.fromEntries(ids.map(id=>[id,{
  id,name:id===match.home.id?match.home.team:match.away.team,
  runs:match.score[id],hits:0,atBats:0,outs:0,
  singles:0,doubles:0,triples:0,homeRuns:0,
  runsByInning:{}
 }]));
 for(const play of match.atBats){
  const t=teams[play.teamId];
  t.atBats++;
  if(play.outcome==='out')t.outs++;
  else{
   t.hits++;
   const field={single:'singles',double:'doubles',triple:'triples',homer:'homeRuns'}[play.outcome];
   t[field]++;
  }
  t.runsByInning[play.inning]=(t.runsByInning[play.inning]||0)+play.runs;
 }
 return {inning:match.inning,half:match.half,outs:match.outs,
  status:match.status,winner:match.winner,
  away:teams[match.away.id],home:teams[match.home.id]};
}
function currentTurn(m){return {team:offense(m).team,playerId:offense(m).id,inning:m.inning,half:m.half,outs:m.outs,status:m.status}}
// Validate persisted V7-only matches before rendering or accepting more swings.
// Never repair, migrate or rewrite an invalid save: recovery is an explicit user action.
function validateMatch(m){
 const fail=reason=>({ok:false,reason});
 if(!m||typeof m!=='object'||Array.isArray(m)||m.version!==1)return fail('Unsupported V7 match format');
 const profile=p=>p&&typeof p.id==='string'&&p.id.length>0&&typeof p.name==='string'&&p.name.trim()&&
  typeof p.team==='string'&&p.team.trim()&&['L','R'].includes(p.hand)&&
  Array.isArray(p.lineup)&&p.lineup.length===9&&p.lineup.every(n=>typeof n==='string'&&n.trim());
 if(!profile(m.home)||!profile(m.away)||m.home.id===m.away.id||m.home.team.toLowerCase()===m.away.team.toLowerCase())
  return fail('Invalid player or lineup');
 if(![3,6,9].includes(m.innings)||!Number.isSafeInteger(m.inning)||m.inning<1||
  !['top','bottom'].includes(m.half)||!Number.isInteger(m.outs)||m.outs<0||m.outs>2)
  return fail('Invalid inning or outs');
 if(!Array.isArray(m.bases)||m.bases.length!==3||m.bases.some(b=>typeof b!=='boolean'))
  return fail('Invalid baserunners');
 if(!['active','final'].includes(m.status)||m.status==='active'&&m.winner!==null||
  m.status==='final'&&![m.home.id,m.away.id].includes(m.winner))
  return fail('Invalid game status');
 if(!m.score||!m.realSwings||!m.battingOrder)return fail('Missing scoring records');
 const ids=[m.home.id,m.away.id],counts=Object.fromEntries(ids.map(id=>[id,0]));
 const runs=Object.fromEntries(ids.map(id=>[id,0]));
 for(const id of ids){
  if(!Number.isSafeInteger(m.score[id])||m.score[id]<0||
   !Number.isSafeInteger(m.realSwings[id])||m.realSwings[id]<0||
   !Number.isInteger(m.battingOrder[id])||m.battingOrder[id]<0||m.battingOrder[id]>8)
   return fail('Invalid score or batting order');
 }
 if(!Array.isArray(m.atBats)||m.atBats.length>10000)return fail('Invalid swing history');
 for(const a of m.atBats){
  if(!a||!ids.includes(a.teamId)||!Number.isInteger(a.index)||a.index<0||a.index>8||
   !Number.isInteger(a.inning)||a.inning<1||a.inning>m.inning||
   !['top','bottom'].includes(a.half)||!ZONES.includes(a.zone)||!POWERS.includes(a.power)||
   !OUTCOMES.includes(a.outcome)||!Number.isSafeInteger(a.runs)||a.runs<0||
   a.outcome==='out'&&a.runs!==0)
   return fail('Invalid recorded swing');
  counts[a.teamId]++;runs[a.teamId]+=a.runs;
 }
 for(const id of ids){
  if(counts[id]!==m.realSwings[id]||counts[id]%9!==m.battingOrder[id]||runs[id]!==m.score[id])
   return fail('Swing history and scoreboard disagree');
 }
 // Reconstruct the game from its actual swing inputs. Conservation of totals
 // alone cannot detect a forged inning, extra out, swapped batter, runner or
 // premature final state. Use the same deterministic rules as live gameplay.
 // Keep the replay history at one entry per step: recordSwing clones its input,
 // so replaying a full 10,000-entry history otherwise has quadratic cost.
 let replay;
 try{
  replay=newMatch(m.home,m.away,m.innings);
  for(const a of m.atBats){
   if(replay.status==='final')return fail('Recorded swing after game ended');
   replay=recordSwing(replay,{zone:a.zone,power:a.power,outcome:a.outcome});
   const expected=replay.atBats[0];
   for(const field of ['teamId','batter','index','inning','half','zone','power','outcome','runs','kind'])
    if(a[field]!==expected[field])return fail('Swing history does not match game progression');
   replay.atBats=[];
  }
 }catch{return fail('Swing history cannot be replayed');}
 if(replay.inning!==m.inning||replay.half!==m.half||replay.outs!==m.outs||
  replay.status!==m.status||replay.winner!==m.winner||
  replay.bases.some((occupied,i)=>occupied!==m.bases[i]))
  return fail('Saved game state does not match swing history');
 for(const id of ids){
  if(replay.score[id]!==m.score[id]||replay.realSwings[id]!==m.realSwings[id]||
   replay.battingOrder[id]!==m.battingOrder[id])
   return fail('Saved game totals do not match replay');
 }
 return {ok:true,reason:null};
}
const api={createProfile,newMatch,recordSwing,currentTurn,scoreRuns,validateMatch,resolveSimulatedOutcome,boxScore};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.HitLabMultiplayer=api;

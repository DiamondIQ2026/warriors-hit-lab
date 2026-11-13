'use strict';
// V7 standalone, deterministic pass-and-play match engine.
// No DOM, storage, production save changes, or random CPU outcomes.
const ZONES=['UL','UC','UR','ML','MC','MR','LL','LC','LR'];
const POWERS=['soft','medium','hard'];
const OUTCOMES=['out','single','double','triple','homer'];
const DIFFICULTIES=['rookie','standard','legend'];
function difficultyOf(match){return match.difficulty===undefined?'standard':match.difficulty;}
function createProfile({id,name,team,hand='R',lineup}){
 if(!id||!name?.trim()||!team?.trim()||!['L','R'].includes(hand))throw Error('Invalid player profile');
 const names=lineup||Array.from({length:9},(_,i)=>'Batter '+(i+1));
 if(!Array.isArray(names)||names.length!==9||names.some(x=>!String(x).trim()))throw Error('Nine lineup slots required');
 return {id:String(id),name:name.trim(),team:team.trim(),hand,lineup:names.map(String)};
}
function newMatch(home,away,innings=3,difficulty='standard'){
 if(!home||!away||home.id===away.id||home.team.toLowerCase()===away.team.toLowerCase()||![3,6,9].includes(innings)||!DIFFICULTIES.includes(difficulty))throw Error('Invalid matchup');
 return {version:1,home,away,innings,difficulty,inning:1,half:'top',outs:0,bases:[false,false,false],score:{[home.id]:0,[away.id]:0},battingOrder:{[home.id]:0,[away.id]:0},atBats:[],realSwings:{[home.id]:0,[away.id]:0},status:'active',winner:null};
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
 const skillShift={rookie:.16,standard:0,legend:-.16}[difficultyOf(match)];
 if(skillShift===undefined)throw Error('Invalid game difficulty');
 const chance=Math.max(.08,Math.min(.9,({soft:.37,medium:.51,hard:.61}[power])+.16*centrality+(handedSide?.025:0)+skillShift));
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
  runsByInning:{},batters:(id===match.home.id?match.home:match.away).lineup.map((name,index)=>({name,index,atBats:0,hits:0,outs:0,singles:0,doubles:0,triples:0,homeRuns:0,runsProduced:0}))
 }]));
 for(const play of match.atBats){
  const t=teams[play.teamId];
  const batter=t.batters[play.index];
  batter.atBats++;batter.runsProduced+=play.runs;
  t.atBats++;
  if(play.outcome==='out'){t.outs++;batter.outs++;}
  else{
   t.hits++;batter.hits++;
   const field={single:'singles',double:'doubles',triple:'triples',homer:'homeRuns'}[play.outcome];
   t[field]++;batter[field]++;
  }
  t.runsByInning[play.inning]=(t.runsByInning[play.inning]||0)+play.runs;
 }
 for(const team of Object.values(teams))for(const batter of team.batters)
  batter.average=batter.atBats?(batter.hits/batter.atBats).toFixed(3).replace(/^0/,''):'.000';
 return {inning:match.inning,half:match.half,outs:match.outs,
  status:match.status,winner:match.winner,
  away:teams[match.away.id],home:teams[match.home.id]};
}
// Postgame recap is derived, never stored. A tie-break for standout hitters
// uses credited runs, then home runs, hits, and original lineup order.
// A short, reverse-chronological play history. Read-only and derived from
// integrity-checked recorded tee swings; never modifies persistent match data.
// Training metrics count only the player's actual tee selections and contact
// self-ratings. They never interpret simulated hits as measured batted-ball data.
// CSV contains logged tee practice only; never export simulated hits as real
// baseball performance. Quote spreadsheet-sensitive text as literal data.
function practiceCsv(match){
 const summary=trainingSummary(match);
 const escapeCell=value=>{
  const raw=String(value);
  const safe=/^[=+@\-\t\r]/.test(raw)?'\''+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
 };
 const rows=[['Player','Team','Hand','Zone','Real tee swings','Hard contact','Medium contact','Soft contact']];
 for(const player of [summary.away,summary.home])
  for(const zone of player.zones)
   rows.push([player.name,player.team,player.hand,zone.number,zone.swings,zone.hard,zone.medium,zone.soft]);
 return rows.map(row=>row.map(escapeCell).join(',')).join('\r\n')+'\r\n';
}
// Suggest the least-practiced net zone for each player. Deterministic,
// encouraging practice guidance, not a claim about batting performance.
// Descriptive coverage, not a skill score or measured contact assessment.
// Lightweight achievements derived from real tee history. These are
// encouraging practice milestones, not simulated batting statistics.
function practiceMilestones(match){
 const summary=trainingSummary(match),coverage=practiceCoverage(match);
 const calculate=(player,zones)=>{
  const awards=[];
  if(player.swings>=1)awards.push({id:'first-rep',title:'First Rep',description:'Logged your first real tee swing.'});
  if(player.swings>=10)awards.push({id:'ten-reps',title:'Ten Reps',description:'Completed 10 real tee swings.'});
  if(player.swings>=25)awards.push({id:'twenty-five-reps',title:'25-Repetition Club',description:'Completed 25 real tee swings.'});
  if(zones.practicedZones>=3)awards.push({id:'three-zones',title:'Zone Explorer',description:'Practiced at least three different net zones.'});
  if(zones.practicedZones===9)awards.push({id:'nine-zones',title:'Full Grid',description:'Logged a tee swing in all nine net zones.'});
  if(player.contact.hard>=5)awards.push({id:'five-hard',title:'Contact Practice',description:'Logged five self-selected hard-contact reps.'});
  return {name:player.name,team:player.team,awards,total:awards.length};
 };
 return {away:calculate(summary.away,coverage.away),home:calculate(summary.home,coverage.home)};
}
function practiceCoverage(match){
 const summary=trainingSummary(match);
 const calculate=player=>{
  const practiced=player.zones.filter(z=>z.swings>0).length;
  const least=Math.min(...player.zones.map(z=>z.swings));
  const most=Math.max(...player.zones.map(z=>z.swings));
  return {name:player.name,team:player.team,swings:player.swings,
   practicedZones:practiced,totalZones:9,unpracticedZones:9-practiced,
   minimumZoneReps:least,maximumZoneReps:most,
   nextStep:practiced===9?'All nine zones have at least one recorded tee swing. Keep practicing with controlled contact.':
    'Practice '+(9-practiced)+' unvisited net zone'+(9-practiced===1?'':'s')+' to cover the full 3×3 grid.'};
 };
 return {home:calculate(summary.home),away:calculate(summary.away)};
}
function nextZoneDrills(match){
 const summary=trainingSummary(match);
 const choose=player=>{
  const min=Math.min(...player.zones.map(z=>z.swings));
  const candidates=player.zones.filter(z=>z.swings===min);
  // Prefer the middle-middle zone on an entirely new practice session;
  // otherwise rotate among equally under-practiced zones by rep count.
  const zone=player.swings===0?player.zones[4]:candidates[player.swings%candidates.length];
  return {name:player.name,team:player.team,zone:zone.zone,number:zone.number,
   completed:zone.swings,target:zone.swings+3,
   instruction:'Try 3 controlled tee swings into net zone '+zone.number+
    '. Choose contact quality after each real swing.'};
 };
 return {away:choose(summary.away),home:choose(summary.home)};
}
function trainingSummary(match){
 const checked=validateMatch(match);
 if(!checked.ok)throw Error('Invalid match: '+checked.reason);
 const create=profile=>({name:profile.name,team:profile.team,hand:profile.hand,
  swings:0,zones:ZONES.map((zone,index)=>({zone,number:index+1,swings:0,hard:0,medium:0,soft:0})),
  contact:{hard:0,medium:0,soft:0}});
 const players=Object.fromEntries([match.home,match.away].map(p=>[p.id,create(p)]));
 for(const play of match.atBats){
  const player=players[play.teamId],zone=player.zones[ZONES.indexOf(play.zone)];
  player.swings++;player.contact[play.power]++;zone.swings++;zone[play.power]++;
 }
 return {totalSwings:match.atBats.length,home:players[match.home.id],away:players[match.away.id]};
}
function recentPlays(match,limit=8){
 const checked=validateMatch(match);
 if(!checked.ok)throw Error('Invalid match: '+checked.reason);
 if(!Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid play history limit');
 return match.atBats.slice(-limit).reverse().map((play,offset)=>({
  number:match.atBats.length-offset,
  team:play.teamId===match.home.id?match.home.team:match.away.team,
  batter:play.batter,inning:play.inning,half:play.half,
  zone:play.zone,power:play.power,outcome:play.outcome,runs:play.runs
 }));
}
function postgameRecap(match){
 const box=boxScore(match);
 if(box.status!=='final')return null;
 const winner=box.winner===box.home.id?box.home:box.away;
 const loser=winner.id===box.home.id?box.away:box.home;
 const leaders=[...box.away.batters.map(b=>({...b,team:box.away.name})),
  ...box.home.batters.map(b=>({...b,team:box.home.name}))];
 leaders.sort((a,b)=>b.runsProduced-a.runsProduced||
  b.homeRuns-a.homeRuns||b.hits-a.hits||a.index-b.index);
 const leader=leaders[0];
 return {winner:winner.name,loser:loser.name,winnerRuns:winner.runs,
  loserRuns:loser.runs,innings:match.inning,
  standout:{name:leader.name,team:leader.team,hits:leader.hits,
   homeRuns:leader.homeRuns,runsProduced:leader.runsProduced}};
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
 if(!DIFFICULTIES.includes(difficultyOf(m)))return fail('Invalid game difficulty');
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
  replay=newMatch(m.home,m.away,m.innings,difficultyOf(m));
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
const api={createProfile,newMatch,recordSwing,currentTurn,scoreRuns,validateMatch,resolveSimulatedOutcome,boxScore,postgameRecap,recentPlays,trainingSummary,practiceCsv,nextZoneDrills,practiceCoverage,practiceMilestones};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.HitLabMultiplayer=api;

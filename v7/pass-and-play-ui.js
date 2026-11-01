'use strict';
(()=>{
 const api=window.HitLabMultiplayer;
 const KEY='warriors-hit-lab-v7-multiplayer-prototype';
 const $=id=>document.getElementById(id);
 let match=null,zone=null,acknowledge=false,lastTurn=null;
 const zones=['UL','UC','UR','ML','MC','MR','LL','LC','LR'];
 function getNames(id){return $(id).value.trim().split(/\r?\n/).map(x=>x.trim());}
 function setDefaults(){
  $('homeLineup').value=Array.from({length:9},(_,i)=>'Titan '+(i+1)).join('\n');
  $('awayLineup').value=Array.from({length:9},(_,i)=>'Warrior '+(i+1)).join('\n');
 }
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(match));}catch{$('event').textContent='Prototype save failed; export a backup.';}}
 function active(){return match.half==='top'?match.away:match.home}
 function render(){
  $('setup').classList.toggle('hidden',!!match);
  $('game').classList.toggle('hidden',!match);
  if(!match)return;
  $('awayScore').textContent=match.away.team+' '+match.score[match.away.id];
  $('homeScore').textContent=match.home.team+' '+match.score[match.home.id];
  $('inning').textContent=match.status==='final'?'FINAL':(match.half==='top'?'TOP ':'BOTTOM ')+match.inning+' • '+match.outs+' OUTS';
  $('bases').textContent='Bases occupied: '+(match.bases.map((v,i)=>v?i+1:null).filter(Boolean).join(', ')||'none');
  $('counts').textContent='Real recorded swings: '+match.away.name+' '+match.realSwings[match.away.id]+' | '+match.home.name+' '+match.realSwings[match.home.id];
  const p=active(),i=match.battingOrder[p.id];
  $('batter').textContent='At bat: '+p.lineup[i]+' (#'+(i+1)+')';
  const now=api.currentTurn(match);
  const token=now.playerId+'-'+now.inning+'-'+now.half;
  if(lastTurn!==token){acknowledge=false;lastTurn=token;$('viewFlight').classList.add('hidden');delete $('viewFlight').dataset.url;if($('flightDialog').open)$('flightDialog').close();$('flightFrame').removeAttribute('src');}
  $('swingPanel').classList.toggle('hidden',match.status==='final'||!acknowledge);
  $('turn').textContent=match.status==='final'?('GAME OVER • WINNER: '+(match.winner===match.home.id?match.home.team:match.away.team)):(acknowledge?('BATTING: '+p.team):('PASS PHONE TO '+p.name.toUpperCase()+' • '+p.team+' — TAP TO CONTINUE'));
  $('turn').disabled=match.status==='final';
  $('record').disabled=!zone||!acknowledge||match.status==='final';
 }
 $('turn').addEventListener('click',()=>{if(match&&match.status==='active'){acknowledge=true;render();}});
 $('start').onclick=()=>{
  try{
   const home=api.createProfile({id:'dad',name:$('homeName').value,team:$('homeTeam').value,hand:$('homeHand').value,lineup:getNames('homeLineup')});
   const away=api.createProfile({id:'maddon',name:$('awayName').value,team:$('awayTeam').value,hand:$('awayHand').value,lineup:getNames('awayLineup')});
   match=api.newMatch(home,away,Number($('innings').value));zone=null;lastTurn=null;acknowledge=false;$('event').textContent='';
   $('setupError').textContent='';persist();render();
  }catch(e){$('setupError').textContent=e.message;}
 };
 const zoneRoot=$('zones');
 for(const [zoneIndex,z] of zones.entries()){
  const b=document.createElement('button');b.textContent=String(zoneIndex+1);b.type='button';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Net impact zone '+(zoneIndex+1)+' of 9 ('+z+')');b.onclick=()=>{zone=z;for(const el of zoneRoot.children){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));}render();};b.addEventListener('keydown',e=>{const keys={ArrowRight:1,ArrowLeft:-1,ArrowDown:3,ArrowUp:-3};if(!(e.key in keys))return;e.preventDefault();const next=(zones.indexOf(z)+keys[e.key]+9)%9;zoneRoot.children[next].focus();});zoneRoot.appendChild(b);
 }
 $('record').onclick=()=>{
  if(!match||match.status==='final'||!acknowledge||!zone)return;
  try{
   const old=api.currentTurn(match);
   match=api.recordSwing(match,{zone,power:$('power').value,outcome:$('outcome').value});
   $('event').textContent='Recorded '+zone+' / '+$('power').value+' • simulated '+$('outcome').value+'.';
   $('viewFlight').dataset.url='./preview.html?'+new URLSearchParams({zone,contact:$('power').value,outcome:$('outcome').value,hand:(old.playerId===match.home.id?match.home:match.away).hand}).toString();
   $('viewFlight').classList.remove('hidden');
   if(old.playerId!==api.currentTurn(match).playerId||old.half!==match.half)acknowledge=false;
   zone=null;for(const el of zoneRoot.children){el.classList.remove('active');el.setAttribute('aria-pressed','false');}
   persist();render();
  }catch(e){$('event').textContent=e.message;}
 };
 $('viewFlight').onclick=()=>{
  const url=$('viewFlight').dataset.url;
  if(!url)return;
  $('flightFrame').src=url;
  $('flightDialog').showModal();
 };
 function closeFlight(){
  $('flightDialog').close();
  $('flightFrame').removeAttribute('src');
 }
 $('closeFlight').onclick=closeFlight;
 $('flightDialog').addEventListener('close',()=>{$('flightFrame').removeAttribute('src')});
  $('backup').onclick=()=>{
  const blob=new Blob([JSON.stringify(match,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hit-lab-v7-multiplayer-prototype.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 $('reset').onclick=()=>{
  if(!confirm('Reset this V7 multiplayer prototype? Existing solo careers are untouched.'))return;
  match=null;zone=null;lastTurn=null;acknowledge=false;localStorage.removeItem(KEY);render();
 };
 setDefaults();
 try{
  const raw=localStorage.getItem(KEY),v=raw?JSON.parse(raw):null;
  if(v&&v.version===1&&v.home?.id==='dad'&&v.away?.id==='maddon'&&['active','final'].includes(v.status)&&Array.isArray(v.atBats)&&Array.isArray(v.bases))match=v;
 }catch{}
 render();
})();

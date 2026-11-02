'use strict';
// Isolated entertainment preview: no localStorage, real-world tracking, or game writes.
(()=>{
 const $=id=>document.getElementById(id);
 const zones=['UL','UC','UR','ML','MC','MR','LL','LC','LR'];
 const outcomes={out:[.52,0,'Ball in play — out'],single:[.43,1,'Single'],double:[.68,2,'Double'],triple:[.82,3,'Triple'],homer:[1,4,'Home run']};
 const fielders=[...document.querySelectorAll('[data-fielder]')].map(node=>({
  node,name:node.dataset.fielder,x:Number(node.getAttribute('cx')),y:Number(node.getAttribute('cy'))
 }));
 let frame=null,flight=null,start=0;
 function point(t){
  // Quadratic Bezier produces a continuous, deterministic simulated flight.
  const [a,b,c]=flight.points,u=1-t;
  return {x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y};
 }
 function map(p){return [400+p.x*340,440-p.y*390];}
 function nearestFielder(target){
  return fielders.reduce((best,f)=>{
   const d=(f.x-target[0])**2+(f.y-target[1])**2;
   return !best||d<best.distance?{fielder:f,distance:d}:best;
  },null)?.fielder;
 }
 function react(t){
  const landing=map(flight.points[2]),lead=nearestFielder(landing);
  const progress=1-(1-Math.max(0,Math.min(1,t)))**2;
  for(const f of fielders){
   const dx=landing[0]-f.x,dy=landing[1]-f.y,distance=Math.hypot(dx,dy)||1;
   const leadFielder=f===lead;
   // A chase is visual only: fielders do not change the chosen game outcome.
   const maxTravel=leadFielder?(flight.outcome==='out'?85:65):13;
   const travel=Math.min(distance,maxTravel)*progress;
   f.node.setAttribute('transform','translate('+(dx/distance*travel).toFixed(2)+' '+(dy/distance*travel).toFixed(2)+')');
   f.node.dataset.react=leadFielder?'lead':'support';
  }
  return lead;
 }
 function display(t){
  const p=map(point(t));
  $('ball').setAttribute('cx',String(p[0]));$('ball').setAttribute('cy',String(p[1]));
  const samples=Array.from({length:Math.floor(t*45)+1},(_,i)=>map(point(Math.min(t,i/45))));
  $('trail').setAttribute('points',samples.map(x=>x.map(n=>n.toFixed(2)).join(',')).join(' '));
  react(t);
 }
 function build(){
  const zone=$('zone').value,contact=$('contact').value,outcome=$('outcome').value,hand=$('hand').value;
  if(!zones.includes(zone)||!['hard','medium','soft'].includes(contact)||!Object.hasOwn(outcomes,outcome)||!['L','R'].includes(hand))throw Error('Invalid simulation setup');
  const col=zone[1]==='L'?-1:zone[1]==='R'?1:0,row=zone[0]==='U'?1:zone[0]==='L'?-1:0;
  const pull=hand==='L'?1:-1,dist=outcomes[outcome][0],loft={hard:.60,medium:.38,soft:.18}[contact];
  const dir=Math.max(-1,Math.min(1,col*.35+pull*.15)),apex=.25+loft*.4+Math.max(0,row)*.1;
  return {durationMs:2200,points:[{x:0,y:0},{x:dir*dist*.52,y:apex},{x:dir*dist,y:dist}],label:outcomes[outcome][2],outcome};
 }
 function finish(){
  if(!flight)return;
  if(frame!==null)cancelAnimationFrame(frame);
  frame=null;display(1);
  const lead=nearestFielder(map(flight.points[2]));
  $('fielderStatus').textContent=(lead?lead.name+' reacted to the simulated ball. ':'')+'Fielding motion is illustrative, not an actual catch or measured trajectory.';
  $('result').textContent=flight.label+' · Simulation complete';
 }
 function play(){
  if(frame!==null)cancelAnimationFrame(frame);
  flight=build();start=performance.now();display(0);
  $('result').textContent='Simulating ball flight…';
  $('fielderStatus').textContent='Fielders reacting to the simulated trajectory.';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
  function tick(now){
   const t=Math.max(0,Math.min(1,(now-start)/flight.durationMs));
   display(t);
   if(t<1)frame=requestAnimationFrame(tick);
   else finish();
  }
  frame=requestAnimationFrame(tick);
 }
 // Optional query parameters configure the isolated preview; never read game saves.
 if(typeof location!=='undefined'&&location.search){
  const params=new URLSearchParams(location.search);
  for(const [key,allowed] of [['zone',zones],['contact',['hard','medium','soft']],['outcome',Object.keys(outcomes)],['hand',['L','R']]]){
   const value=params.get(key);
   if(value&&allowed.includes(value))$(key).value=value;
  }
  $('result').textContent='Swing outcome loaded — press PLAY to see the simulation.';
 }
 $('play').addEventListener('click',play);
 $('replay').addEventListener('click',play);
 $('skip').addEventListener('click',()=>{if(!flight)flight=build();finish();});
})();

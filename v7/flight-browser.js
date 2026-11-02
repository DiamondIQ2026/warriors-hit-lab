'use strict';
// Standalone preview only. No storage, production application, or statistics.
(()=> {
 const $=id=>document.getElementById(id);
 const zones=['UL','UC','UR','ML','MC','MR','LL','LC','LR'];
 const outcomes={out:[.52,0,'Ball in play — out'],single:[.43,1,'Single'],double:[.68,2,'Double'],triple:[.82,3,'Triple'],homer:[1,4,'Home run']};
 let frame=null, flight=null, start=0, coords=[];
 function point(t){
   const p=flight.points;
   const a=t<=.5?p[0]:p[1],b=t<=.5?p[1]:p[2],f=t<=.5?t*2:(t-.5)*2;
   return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};
 }
 function map(p){return [400+p.x*340,440-p.y*390];}
 function display(t){
   const p=map(point(t));
   $('ball').setAttribute('cx',String(p[0]));$('ball').setAttribute('cy',String(p[1]));
   const samples=Array.from({length:Math.floor(t*45)+1},(_,i)=>map(point(Math.min(t,i/45))));
   $('trail').setAttribute('points',samples.map(x=>x.map(n=>n.toFixed(2)).join(',')).join(' '));
 }
 function build(){
   const zone=$('zone').value,contact=$('contact').value,outcome=$('outcome').value,hand=$('hand').value;
   if(!zones.includes(zone)||!['hard','medium','soft'].includes(contact)||!Object.hasOwn(outcomes,outcome)||!['L','R'].includes(hand))throw Error('Invalid simulation setup');
   const col=zone[1]==='L'?-1:zone[1]==='R'?1:0,row=zone[0]==='U'?1:zone[0]==='L'?-1:0;
   const pull=hand==='L'?1:-1,dist=outcomes[outcome][0],loft={hard:.60,medium:.38,soft:.18}[contact];
   const dir=Math.max(-1,Math.min(1,col*.35+pull*.15)),apex=.25+loft*.4+Math.max(0,row)*.1;
   return {durationMs:2200,points:[{x:0,y:0},{x:dir*dist*.52,y:apex},{x:dir*dist,y:dist}],label:outcomes[outcome][2]};
 }
 function finish(){if(frame!==null)cancelAnimationFrame(frame);frame=null;display(1);$('result').textContent=flight.label+' · Simulation complete';}
 function play(){
   if(frame!==null)cancelAnimationFrame(frame);
   flight=build();start=performance.now();display(0);
   $('result').textContent='Simulating ball flight…';
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
   function tick(now){const t=Math.max(0,Math.min(1,(now-start)/flight.durationMs));display(t);if(t<1)frame=requestAnimationFrame(tick);else finish();}
   frame=requestAnimationFrame(tick);
 }
 // Populate the stand-alone preview from an optional swing link. Never read game saves.
 if(typeof location!=='undefined' && location.search){
   const params=new URLSearchParams(location.search);
   for(const [key,allowed] of [['zone',zones],['contact',['hard','medium','soft']],['outcome',Object.keys(outcomes)],['hand',['L','R']]]){
     const value=params.get(key);
     if(value && allowed.includes(value))$(key).value=value;
   }
   $('result').textContent='Swing outcome loaded — press PLAY to see the simulation.';
 }
 $('play').addEventListener('click',play);
 $('replay').addEventListener('click',play);
 $('skip').addEventListener('click',()=>{if(!flight)flight=build();finish();});
})();

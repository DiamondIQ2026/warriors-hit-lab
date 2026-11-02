'use strict';
// V7 prototype: pure model for displaying *simulated* baseball outcomes.
// No player data, browser storage, DOM, audio, or production game code access.
const HIT_TYPES = Object.freeze(['out','single','double','triple','homer']);
const CONTACT = Object.freeze(['soft','medium','hard']);
const ZONES = Object.freeze(['UL','UC','UR','ML','MC','MR','LL','LC','LR']);
function describeFlight({zone,contact,outcome,hand='R',durationMs=2200}) {
 if(!ZONES.includes(zone)) throw new Error('Invalid net zone');
 if(!CONTACT.includes(contact)) throw new Error('Invalid contact');
 if(!HIT_TYPES.includes(outcome)) throw new Error('Invalid simulated outcome');
 if(!['L','R'].includes(hand)) throw new Error('Invalid handedness');
 const duration=Math.max(500,Math.min(4000,Number(durationMs)||2200));
 // Coordinates are conceptual and never claim physical camera or bat tracking.
 const col=zone[1]==='L'?-1:zone[1]==='R'?1:0;
 const row=zone[0]==='U'?1:zone[0]==='L'?-1:0;
 const pull=hand==='L'?1:-1;
 const distance={out:0.52,single:0.43,double:0.68,triple:0.82,homer:1}[outcome];
 const loft={soft:0.18,medium:0.38,hard:0.60}[contact];
 const direction=Math.max(-1,Math.min(1,col*0.35+pull*0.15));
 const apex=0.25+loft*0.4+Math.max(0,row)*0.1;
 return Object.freeze({
   simulated:true,zone,contact,outcome,hand,durationMs:duration,
   points:Object.freeze([
    Object.freeze({t:0,x:0,y:0}),
    Object.freeze({t:0.5,x:direction*distance*0.52,y:apex}),
    Object.freeze({t:1,x:direction*distance,y:distance})
   ]),
   basesEarned:({out:0,single:1,double:2,triple:3,homer:4})[outcome],
   label:({out:'Ball in play — out',single:'Single',double:'Double',triple:'Triple',homer:'Home run'})[outcome]
 });
}
function atTime(flight, elapsedMs) {
 const p=flight.points;
 const t=Math.max(0,Math.min(1,(Number(elapsedMs)||0)/flight.durationMs));
 const a=t<=0.5?p[0]:p[1],b=t<=0.5?p[1]:p[2];
 const f=t<=0.5?t*2:(t-0.5)*2;
 return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,done:t===1};
}
module.exports={describeFlight,atTime,ZONES,HIT_TYPES,CONTACT};

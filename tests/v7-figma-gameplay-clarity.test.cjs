'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const html=readFileSync(require('node:path').join(__dirname,'../v7/multiplayer.html'),'utf8');
const ui=readFileSync(require('node:path').join(__dirname,'../v7/pass-and-play-ui.js'),'utf8');
test('Gameplay styling reflects verified Figma tokens without changing gameplay hooks',()=>{
 for(const token of ['#080f1c','#cf3541','#101c2e','#2a3a50'])assert.ok(html.includes(token),token);
 for(const id of ['start','record','turn','zones','power','outcome','awayScore','homeScore','viewFlight','flightDialog'])assert.match(html,new RegExp('id="'+id+'"'));
});
test('Real practice is visually and semantically distinguished from simulated result',()=>{
 assert.match(html,/REAL PRACTICE · TEE SWINGS/);
 assert.match(html,/game outcome is simulated; it is not a measured ball flight/i);
 assert.match(html,/Simulated game result<select id="outcome"/);
 assert.match(html,/class="practice-note" aria-label="Real practice and simulated outcome explanation"/);
});
test('Primary action remains above nine-zone grid',()=>{
 const record=html.indexOf('id="record"'),zones=html.indexOf('id="zones"');
 assert.ok(record>0 && zones>record);
 assert.match(html,/#record:disabled/);
 assert.match(html,/\.zones button\{min-height:70px\}/);
});

test('Nine numeric buttons preserve stable impact codes and accessible labels',()=>{
 assert.match(ui,/for\(const \[zoneIndex,z\] of zones\.entries\(\)\)/);
 assert.match(ui,/b\.textContent=String\(zoneIndex\+1\)/);
 assert.match(ui,/Net impact zone /);
 assert.match(ui,/zone=z/);
 assert.match(ui,/setAttribute\('aria-pressed',String\(el===b\)\)/);
 assert.match(ui,/const zones=\['UL','UC','UR','ML','MC','MR','LL','LC','LR'\]/);
});

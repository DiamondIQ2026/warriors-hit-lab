'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../v7/multiplayer.html'),'utf8');
test('V7 shell has compact branded header and placeholder-only mark',()=>{
 assert.match(html, /class="v7-header" aria-label="Warriors Hit Lab"/);
 assert.match(html,/Temporary W placeholder, not the official team logo/);
 assert.match(html,/TRAIN REAL\. PLAY BIG\. \/ V7/);
});
test('Navigation has six visible destinations, current Play, and no fake live routes',()=>{
 assert.match(html,/class="v7-nav" aria-label="Main navigation"/);
 const nav=html.match(/<nav class="v7-nav"[\s\S]*?<\/nav>/)?.[0]||'';
 for(const label of ['Home','Play','Academy','Season','Cup','Team'])assert.match(nav,new RegExp('>'+label+'<'));
 assert.match(nav,/aria-current="page"/);
 assert.equal((nav.match(/class="nav-disabled"/g)||[]).length,3);
 assert.equal((nav.match(/aria-label="[^"]*not available in prototype"/g)||[]).length,3);
});
test('Navigation does not remove original game state and swing IDs',()=>{
 for(const id of ['setup','game','start','record','turn','zones','power','outcome','homeScore','awayScore','flightDialog'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/safe-area-inset-bottom/);
 assert.match(html,/\.v7-nav a:focus-visible/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','v7','multiplayer.html'),'utf8');
test('simulated field has exactly nine noninteractive fielder markers',()=>{
 const names=['p','c','1b','2b','3b','ss','lf','cf','rf'];
 for(const name of names)assert.equal((html.match(new RegExp('class="field-fielder fielder-'+name+'"','g'))||[]).length,1,name);
 assert.ok(html.includes('.simulated-field .field-fielder'));
 assert.ok(html.includes('pointer-events:none'));
 assert.ok(html.includes('prefers-reduced-motion:reduce'));
 assert.ok(html.includes('animation:none!important'));
});
test('real practice and simulated game result remain clearly distinguished',()=>{
 assert.ok(html.includes('SIMULATED GAME · FIELD VIEW'));
 assert.ok(html.includes('REAL PRACTICE · TEE SWINGS'));
 assert.ok(html.includes('The game outcome is simulated; it is not a measured ball flight.'));
 assert.ok(html.includes('id="record"'));
});

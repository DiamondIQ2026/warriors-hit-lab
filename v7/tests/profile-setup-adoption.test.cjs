'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'multiplayer.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'pass-and-play-ui.js'),'utf8');

test('explicit home and away adoption buttons are available in game setup',()=>{
 assert.match(html,/id="useAlphaHome"/);
 assert.match(html,/id="useAlphaAway"/);
 assert.match(html,/id="alphaSetupStatus" role="status"/);
 assert.match(ui,/\$\('useAlphaHome'\)\.addEventListener\('click'/);
 assert.match(ui,/\$\('useAlphaAway'\)\.addEventListener\('click'/);
});
test('adoption requires a valid shared profile and refuses active matches',()=>{
 const block=ui.slice(ui.indexOf('function adoptAlphaProfile('),ui.indexOf(" $('useAlphaHome').addEventListener"));
 assert.ok(block.includes("if(match){"));
 assert.ok(block.includes("shared.read(localStorage)"));
 assert.ok(block.includes("saved.status!=='ok'"));
 assert.ok(block.indexOf('if(match)')<block.indexOf("shared.read(localStorage)"));
});
test('adoption changes only setup identity fields, never match state, lineups or saved games',()=>{
 const block=ui.slice(ui.indexOf('function adoptAlphaProfile('),ui.indexOf(" $('useAlphaHome').addEventListener"));
 assert.ok(block.includes("$(prefix+'Name').value"));
 assert.ok(block.includes("$(prefix+'Team').value"));
 assert.ok(block.includes("$(prefix+'Hand').value"));
 assert.doesNotMatch(block,/setItem|removeItem|match\s*=|Lineup'\)\.value|persist\(/);
});
test('handedness maps from shared profile to game form without a forced save',()=>{
 const block=ui.slice(ui.indexOf('function adoptAlphaProfile('),ui.indexOf(" $('useAlphaHome').addEventListener"));
 assert.match(block,/saved\.profile\.hand==='Left'\?'L':'R'/);
 assert.ok(html.includes('src="./alpha/shared-profile.cjs"'));
});

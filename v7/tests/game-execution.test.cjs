'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execute}=require('../alpha/game-execution.cjs');
const cpu=(x={})=>({gameStarted:true,gameFinished:false,inning:1,outs:0,home:0,away:0,bases:[false,false,false],...x});
const rivalry=(x={})=>({version:1,status:'active',home:{id:'dad'},away:{id:'maddon'},inning:1,half:'top',outs:0,score:{dad:0,maddon:0},battingOrder:{dad:0,maddon:0},bases:[false,false,false],...x});
test('CPU runs its engine callback exactly once with no save writes',()=>{
 let count=0;
 const start=cpu(), result=execute('cpu',start,s=>{count++;return cpu({...s,outs:1});});
 assert.equal(count,1);assert.equal(result.next.outs,1);assert.equal(result.observation.to.outs,1);assert.equal(start.outs,0);
});
test('Family Rivalry preserves engine score and lineup',()=>{
 const start=rivalry(),next=rivalry({score:{dad:0,maddon:1},battingOrder:{dad:0,maddon:1}});
 const result=execute('rivalry',start,()=>next);
 assert.equal(result.next,next);assert.equal(result.observation.scoreDelta.away,1);
 assert.equal(result.observation.to.battingOrder.away,1);
});
test('warnings do not overwrite the authoritative game result',()=>{
 const result=execute('cpu',cpu(),()=>cpu({outs:3}));
 assert.equal(result.next.outs,3);assert.equal(result.observation,null);
 assert.match(result.warning,/Invalid/);
});
test('rejects invalid execution mode without calling game engine',()=>{
 let calls=0;
 assert.throws(()=>execute('v6',cpu(),()=>{calls++;return cpu();}));
 assert.equal(calls,0);
});
test('both live swing handlers are wired to shared adapter',()=>{
 const p=path.join(__dirname,'..');
 const multiplayer=fs.readFileSync(path.join(p,'pass-and-play-ui.js'),'utf8');
 const cpuHtml=fs.readFileSync(path.join(p,'experimental/visual-prototype.html'),'utf8');
 assert.match(multiplayer,/HitLabExecution\.execute\('rivalry'/);
 assert.match(cpuHtml,/HitLabExecution\.execute\('cpu'/);
 for(const html of [cpuHtml,fs.readFileSync(path.join(p,'multiplayer.html'),'utf8')])
   assert.match(html,/game-execution\.cjs/);
});

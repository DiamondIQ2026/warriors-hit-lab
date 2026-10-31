'use strict';
// Storage migration tests run against the actual V6.3 initialization code in an isolated
// Node VM with an in-memory storage stub; NO player's browser or production code touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)]
  .map(m => m[1]).find(s => s.includes("const KEY='warriors-hit-lab-v4'"));
assert.ok(script, 'Expected V6.3 application script');
const start = script.indexOf("const KEY='warriors-hit-lab-v4'");
const end = script.indexOf('const rosterDefaults=', start);
assert.ok(start >= 0 && end > start, 'Save initialization boundaries should be present');

function loadWithStorage(entries) {
  const backing = new Map(Object.entries(entries).map(([k,v]) => [k, typeof v==='string'?v:JSON.stringify(v)]));
  const writes = [];
  const storage = {
    getItem(k) { return backing.has(k) ? backing.get(k) : null; },
    setItem(k,v) { writes.push([k,String(v)]); backing.set(k,String(v)); }
  };
  const context = { localStorage:storage, document:{getElementById(){throw Error('DOM should not be accessed');}} };
  vm.runInNewContext(script.slice(start,end) + '\n;globalThis.__loaded=d;',context,{timeout:1000});
  return {data:context.__loaded,writes};
}
const key='warriors-hit-lab-v4';
const legacy='warriors-hit-lab-v3';
const old='warriors-hit-lab-career-v2';
const base={version:4,stats:{ab:18,h:7,hr:2},teams:['Custom Club'],completed:[],log:['past game'],team:'Tampa Warriors',games:4,wins:3,losses:1,season:{id:'synthetic-season'},tournament:{id:'synthetic-cup'},game:{inning:2,outs:1,score:4,other:3,lineupPos:5},seasonHistory:[{id:'previous-season'}],tournamentHistory:[{id:'prior-cup'}]};

test('fresh installation gets a valid initial state without modifying storage',()=>{
 const {data,writes}=loadWithStorage({});
 assert.equal(data.version,4);
 assert.equal(data.team,'Tampa Warriors');
 assert.equal(data.game,null);
 assert.equal(writes.length,0);
});

test('current v4 JSON retains career, season, tournament and in-progress game on initialization',()=>{
 const {data,writes}=loadWithStorage({[key]:base});
 assert.equal(data.stats.ab,18); assert.equal(data.stats.hr,2);
 assert.equal(data.wins,3); assert.equal(data.games,4);
 assert.equal(data.season.id,'synthetic-season');
 assert.equal(data.tournament.id,'synthetic-cup');
 assert.equal(data.game.inning,2); assert.equal(data.game.lineupPos,5);
 assert.equal(data.seasonHistory[0].id,'previous-season');
 assert.equal(data.tournamentHistory[0].id,'prior-cup');
 assert.equal(data.log[0],'past game');
 assert.equal(writes.length,0);
});

test('v3 legacy JSON is accepted and normalized to v4 while keeping career data',()=>{
 const {data,writes}=loadWithStorage({[legacy]:{...base,version:3}});
 assert.equal(data.version,4); assert.equal(data.stats.h,7);
 assert.equal(data.game.outs,1); assert.equal(data.season.id,'synthetic-season');
 assert.equal(writes.length,0);
});

test('v2 career migration preserves documented aggregate fields',()=>{
 const {data,writes}=loadWithStorage({[old]:{version:2,xp:120,wins:6,losses:3,ties:1,games:10,ab:44,hits:16,hr:5,bestStreak:3,teams:['My Squad'],history:['Won a game']}});
 assert.equal(data.version,4);assert.equal(data.xp,120);
 assert.equal(data.wins,6);assert.equal(data.games,10);
 assert.equal(data.stats.ab,44);assert.equal(data.stats.h,16);
 assert.equal(data.stats.hr,5);assert.equal(data.stats.bestStreak,3);
 assert.equal(data.log[0],'Won a game');assert.ok(data.teams.includes('My Squad'));
 assert.equal(writes.length,0);
});

test('malformed save JSON falls back to defaults without writing',()=>{
 const {data,writes}=loadWithStorage({[key]:'{broken'});
 assert.equal(data.version,4);assert.equal(data.stats.ab,0);
 assert.equal(writes.length,0);
});

test('export-style JSON round trip preserves synthetic save when reloaded',()=>{
 const exported=JSON.stringify(base,null,2);
 const parsed=JSON.parse(exported);
 const {data}=loadWithStorage({[key]:parsed});
 assert.equal(data.stats.h,base.stats.h);
 assert.equal(data.seasonHistory[0].id,'previous-season');
 assert.equal(data.game.score,4);
});

'use strict';
// Exercise the actual V6.3 export/import handlers in an isolated VM and synthetic
// in-memory storage. No real user save, browser profile or production code is touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)]
  .map(m=>m[1]).find(s=>s.includes("const KEY='warriors-hit-lab-v4'"));
assert.ok(script);
function sliceBetween(start,end) {
  const a=script.indexOf(start), b=script.indexOf(end,a);
  assert.ok(a>=0 && b>a,'Missing application code boundary: '+start);
  return script.slice(a,b);
}
const initialization = sliceBetween("const KEY='warriors-hit-lab-v4'","const rand=");
const backup = sliceBetween("function backup()","$('quickMute').onclick");
const importHandlers = sliceBetween("$('importButton').onclick",";$('reset').onclick");
const records = {
  version:4,
  stats:{ab:15,h:8,hr:2}, teams:['Test Team'], completed:[], log:['Synthetic game'],
  team:'Tampa Warriors', player:{name:'Synthetic Player',hand:'R'},
  wins:2, losses:1, games:3,
  season:{id:'sample-season'}, tournament:{id:'sample-tournament'},
  game:{inning:2,outs:1,lineupPos:4,score:3,other:2}
};
function sandbox(starting={},answer=true){
  const values=new Map(Object.entries(starting));
  const writes=[];
  const elements=new Map();
  function element(id){
    if(!elements.has(id))elements.set(id,{textContent:'',value:'',click(){this.clicked=true}});
    return elements.get(id);
  }
  let downloaded;
  const urlApi={
    createObjectURL(b){downloaded=b;return 'blob:synthetic'},
    revokeObjectURL(){}
  };
  const context={
    localStorage:{
      getItem(k){return values.has(k)?values.get(k):null},
      setItem(k,v){values.set(k,String(v));writes.push([k,String(v)])}
    },
    document:{getElementById:element,createElement(){return {click(){this.clicked=true}}}},
    URL:urlApi,Blob, setTimeout(){}, confirm(){return answer}, console,
    tab(){},render(){}
  };
  const code=initialization+'\n'+
    "function ensureRoster(){if(!Array.isArray(d.roster)||d.roster.length!==9)d.roster=Array.from({length:9},(_,i)=>({id:'p'+i,hand:'R',contact:75,power:75,speed:75,clutch:75,ab:0,h:0,hr:0,rbi:0,doubles:0,triples:0}));if(d.game&&!Number.isInteger(d.game.lineupPos))d.game.lineupPos=0;}"+
    '\n'+backup+'\n'+importHandlers+
    '\n;globalThis.__test={getData:()=>d,setData:v=>{d=v},exportBackup:backup}';
  vm.runInNewContext(code,context,{timeout:2000});
  return {context,values,writes,elements,downloaded:()=>downloaded,api:context.__test};
}
const sourceSave={...records};
test('export writes JSON into a downloadable Blob without changing localStorage',async()=>{
 const env=sandbox();
 env.api.setData(sourceSave);
 env.api.exportBackup();
 const blob=env.downloaded();
 assert.ok(blob instanceof Blob);
 assert.deepEqual(JSON.parse(await blob.text()),sourceSave);
 assert.equal(env.writes.length,0);
});
test('confirmed import replaces only synthetic in-memory save and restores progress',async()=>{
 const env=sandbox();
 const file={text:async()=>JSON.stringify(sourceSave)};
 const input=env.elements.get('importFile');
 await input.onchange({target:{files:[file],value:'old'}});
 const saved=JSON.parse(env.values.get('warriors-hit-lab-v4'));
 assert.equal(saved.stats.h,8);
 assert.equal(saved.season.id,'sample-season');
 assert.equal(saved.tournament.id,'sample-tournament');
 assert.equal(saved.game.inning,2);
 assert.equal(saved.player.name,'Synthetic Player');
});
test('declined import does not overwrite a previous synthetic career',async()=>{
 const first=JSON.stringify({...sourceSave,stats:{ab:200,h:100}});
 const env=sandbox({'warriors-hit-lab-v4':first},false);
 await env.elements.get('importFile').onchange({target:{files:[{text:async()=>JSON.stringify(sourceSave)}],value:'old'}});
 assert.equal(env.values.get('warriors-hit-lab-v4'),first);
 assert.equal(env.writes.length,0);
});
test('invalid imported backup is rejected without overwriting storage',async()=>{
 const first=JSON.stringify(sourceSave);
 const env=sandbox({'warriors-hit-lab-v4':first});
 await env.elements.get('importFile').onchange({target:{files:[{text:async()=>'{not valid'}],value:'old'}});
 assert.equal(env.values.get('warriors-hit-lab-v4'),first);
 assert.equal(env.writes.length,0);
 assert.match(env.elements.get('saveMessage').textContent,/not a valid/i);
});

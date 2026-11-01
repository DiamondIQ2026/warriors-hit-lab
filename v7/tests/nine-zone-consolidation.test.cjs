'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const rules=require('../alpha/nine-zone-rules.cjs');
test('all nine zone numbers map reversibly to corresponding net positions',()=>{
 for(let i=1;i<=9;i++){
  assert.equal(rules.number(rules.label(i)),i);
  assert.equal(rules.label(String(i)),rules.ZONES[i-1]);
 }
});
test('invalid zone inputs fail closed',()=>{
 for(const bad of [0,10,-1,'0','10','mc','',null,{},1.5,'../'])
  assert.throws(()=>rules.number(bad));
});
test('CPU and rivalry UI use the same source of nine-zone truth',()=>{
 const root=path.join(__dirname,'..');
 const cpu=fs.readFileSync(path.join(root,'experimental/visual-prototype.html'),'utf8');
 const rivalry=fs.readFileSync(path.join(root,'pass-and-play-ui.js'),'utf8');
 assert.match(cpu,/HitLabZoneRules\.number\(b\.dataset\.zone\)/);
 assert.match(rivalry,/HitLabZoneRules\.ZONES/);
 assert.match(rivalry,/HitLabZoneRules\.label\(z\)/);
});

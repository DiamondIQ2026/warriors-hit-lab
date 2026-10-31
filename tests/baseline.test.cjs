'use strict';
// V6.3 preservation tests: pure, read-only checks. No browser storage is written.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('index.html', 'utf8');
const script = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m => m[1]).find(s => s.includes("warriors-hit-lab-v4"));
assert.ok(script, 'Expected V6.3 application inline script');

test('V6.3 script parses without executing it or touching saved data', () => {
  assert.doesNotThrow(() => new vm.Script(script, { filename: 'index-inline.js' }));
});

test('current and legacy save keys remain available', () => {
  assert.match(script, /const KEY='warriors-hit-lab-v4'/);
  assert.match(script, /const PREVIOUS='warriors-hit-lab-v3'/);
  assert.match(script, /const OLD='warriors-hit-lab-career-v2'/);
  assert.match(script, /warriors-hit-lab-v6-snapshot/);
});

test('save validator accepts recognized versions and rejects malformed records', () => {
  // Isolate the pure validation function from the app; do not run the application.
  const match = script.match(/function valid\(o\)\{return [^{}]+\}/);
  assert.ok(match, 'Legacy save validator must remain present');
  const valid = vm.runInNewContext('(' + match[0] + ')');
  const record = {stats:{ab:0},teams:[],completed:[],log:[]};
  assert.equal(valid({...record,version:3}),true);
  assert.equal(valid({...record,version:4}),true);
  assert.equal(Boolean(valid({...record,version:5})),false);
  assert.equal(Boolean(valid({...record,version:4,stats:{}})),false);
  assert.equal(Boolean(valid({...record,version:4,teams:null})),false);
});

test('backup and restore controls remain in the page', () => {
  for (const id of ['exportSave','importFile','restoreSnapshot']) {
    assert.ok(source.includes('id="' + id + '"'), 'Missing save control: ' + id);
  }
  assert.match(script,/function backup\(\)/);
  assert.match(script,/JSON\.stringify\(d,null,2\)/);
});

test('recovery snapshot is retained before overwriting completed-game saves', () => {
  assert.match(script,/prev&&prev!==next&&d\.game===null/);
  assert.match(script,/localStorage\.setItem\('warriors-hit-lab-v6-snapshot',prev\)/);
});

test('existing game modes and nine-zone net stay present', () => {
  for(const name of ['Quick Play','Season','Tournament']) {
    assert.ok(source.includes(name), 'Expected game mode label: ' + name);
  }
  for(const zone of ['UL','UC','UR','ML','MC','MR','LL','LC','LR']) {
    assert.match(script,new RegExp('\\b'+zone+':0\\b'));
  }
});

'use strict';
// Test-only real Chromium Web Locks + same-origin localStorage regression.
// Uses the actual experimental V7 CJS sources in two browser tabs.
// Never loads live V6.3, production URLs or real user saves.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const {encode}=require('../v7/save-envelope.cjs');

const root=path.resolve(__dirname,'..');
const sources=Object.fromEntries([
 ['envelope','v7/save-envelope.cjs'],
 ['write','v7/save-write.cjs'],
 ['lock','v7/save-lock.cjs']
].map(([key,file])=>[key,fs.readFileSync(path.join(root,file),'utf8')]));

function installActualModules(source){
 const cache={};
 const paths={'./save-envelope.cjs':'envelope','./save-write.cjs':'write'};
 function load(name){
  if(cache[name])return cache[name].exports;
  const module={exports:{}};
  cache[name]=module;
  const localRequire=relative=>{
   if(!Object.hasOwn(paths,relative))throw Error('Unexpected require: '+relative);
   return load(paths[relative]);
  };
  new Function('require','module','exports',source[name])(localRequire,module,module.exports);
  return module.exports;
 }
 const {selectSlots}=load('envelope');
 const {LOCK_NAME,writeExistingSaveLocked}=load('lock');
 window.saveTest={
  lockName:LOCK_NAME,
  save:(payload,expectedSeq)=>writeExistingSaveLocked(navigator.locks,localStorage,payload,{expectedSeq}),
  unavailable:(payload,expectedSeq)=>writeExistingSaveLocked(null,localStorage,payload,{expectedSeq}),
  inspect:()=>selectSlots(localStorage)
 };
}

test('native Web Locks serializes real same-origin tabs at 375px and 390px', {timeout:90000},async()=>{
 const server=http.createServer((_req,res)=>{
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end('<!doctype html><title>Isolated V7 save-lock QA</title>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const origin='http://127.0.0.1:'+server.address().port+'/';
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const a=await context.newPage(),b=await context.newPage();
  await a.setViewportSize({width:375,height:812});
  await b.setViewportSize({width:390,height:844});
  await Promise.all([a.goto(origin),b.goto(origin)]);
  await Promise.all([a.evaluate(installActualModules,sources),b.evaluate(installActualModules,sources)]);
  assert.equal(await a.evaluate(()=>typeof navigator.locks?.request),'function',
   'Native Web Locks must be available in secure localhost context');

  const seed=encode({writer:'seed'},{seq:1,savedAt:'2026-11-01T00:00:00.000Z'});
  await a.evaluate(raw=>{
   localStorage.setItem('whl7:slot:a',raw);
   localStorage.setItem('warriors-hit-lab-v4','LEGACY SENTINEL — DO NOT MODIFY');
  },seed);
  assert.equal((await b.evaluate(()=>window.saveTest.inspect())).seq,1);

  // Hold the actual native lock in tab A while tab B attempts to write.
  const held=a.evaluate(async()=>navigator.locks.request(window.saveTest.lockName,
   {mode:'exclusive'},async()=>{
    window.__testLockHeld=true;
    await new Promise(resolve=>{window.__releaseTestLock=resolve;});
   }));
  await a.waitForFunction(()=>window.__testLockHeld===true);
  const busy=await b.evaluate(()=>window.saveTest.save({writer:'B-busy'},1));
  assert.deepEqual(busy,{status:'LOCK_BUSY'});
  await a.evaluate(()=>window.__releaseTestLock());
  await held;

  const first=await a.evaluate(()=>window.saveTest.save({writer:'A'},1));
  assert.deepEqual(first,{status:'SAVED',slot:'b',seq:2});
  const stale=await b.evaluate(()=>window.saveTest.save({writer:'B-stale'},1));
  assert.equal(stale.status,'CONFLICT');

  // Race two real tabs from the same observed version. Exactly one may save.
  const competing=await Promise.all([
   a.evaluate(()=>window.saveTest.save({writer:'A2'},2)),
   b.evaluate(()=>window.saveTest.save({writer:'B2'},2))
  ]);
  assert.equal(competing.filter(x=>x.status==='SAVED').length,1,JSON.stringify(competing));
  assert.equal(competing.filter(x=>['CONFLICT','LOCK_BUSY'].includes(x.status)).length,1,
   JSON.stringify(competing));
  const final=await a.evaluate(()=>window.saveTest.inspect());
  assert.equal(final.status,'OK');
  assert.equal(final.seq,3);
  assert.ok(['A2','B2'].includes(final.payload.writer));

  const unavailable=await b.evaluate(()=>window.saveTest.unavailable({writer:'no-lock'},3));
  assert.deepEqual(unavailable,{status:'LOCK_UNAVAILABLE'});
  const legacy=await a.evaluate(()=>localStorage.getItem('warriors-hit-lab-v4'));
  assert.equal(legacy,'LEGACY SENTINEL — DO NOT MODIFY');
  const keys=await a.evaluate(()=>Object.keys(localStorage).sort());
  assert.deepEqual(keys,['warriors-hit-lab-v4','whl7:slot:a','whl7:slot:b']);
  await context.close();
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
});

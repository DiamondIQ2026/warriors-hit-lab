'use strict';
// Isolated Playwright WebKit browser QA; NOT a physical iPhone/Safari acceptance test.
// Explicitly simulate missing Web Locks, even if this WebKit build implements them.
// Never opens V6.3, production, or a real user save.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const sources=Object.fromEntries([
 ['envelope','v7/save-envelope.cjs'],
 ['write','v7/save-write.cjs'],
 ['lock','v7/save-lock.cjs']
].map(([key,file])=>[key,fs.readFileSync(path.join(root,file),'utf8')]));

function installModules(source){
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
 const {writeExistingSaveLocked}=load('lock');
 window.saveTest={
  inspect:()=>selectSlots(localStorage),
  noLocks:(payload,seq)=>writeExistingSaveLocked(null,localStorage,payload,{expectedSeq:seq}),
  rejected:(payload,seq)=>writeExistingSaveLocked({
   request:async()=>{throw Error('SecurityError');}
  },localStorage,payload,{expectedSeq:seq}),
  native:(payload,seq)=>writeExistingSaveLocked(navigator.locks,localStorage,payload,{expectedSeq:seq}),
  nativeAvailable:()=>typeof navigator.locks?.request==='function'
 };
}

test('WebKit 375/390: missing/rejected locks fail closed without changing save slots or legacy keys',{timeout:120000},async()=>{
 const server=http.createServer((_req,res)=>{
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end('<!doctype html><title>Isolated WebKit V7 save QA</title>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await webkit.launch({headless:true});
  const context=await browser.newContext();
  const origin='http://127.0.0.1:'+server.address().port+'/';
  for(const width of [375,390]){
   const page=await context.newPage();
   await page.setViewportSize({width,height:812});
   await page.goto(origin);
   await page.evaluate(installModules,sources);
   await page.evaluate(()=>{
    localStorage.clear();
    localStorage.setItem('warriors-hit-lab-v4','LEGACY-SENTINEL');
    localStorage.setItem('whl7:slot:a','UNCHANGED-TEST-SLOT');
   });
   const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).sort()));
   assert.deepEqual(await page.evaluate(()=>window.saveTest.noLocks({writer:'missing'},1)),
    {status:'LOCK_UNAVAILABLE'});
   assert.deepEqual(await page.evaluate(()=>window.saveTest.rejected({writer:'rejected'},1)),
    {status:'LOCK_ERROR'});
   const after=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).sort()));
   assert.deepEqual(after,before,'Unsupported/denied locks must not write any key');
   // Observe native capability without asserting all Safari/iPhone versions behave alike.
   const supported=await page.evaluate(()=>window.saveTest.nativeAvailable());
   if(!supported){
    assert.deepEqual(await page.evaluate(()=>window.saveTest.native({writer:'native'},1)),
     {status:'LOCK_UNAVAILABLE'});
   }
   assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).sort())),before);
   await page.close();
  }
  await context.close();
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
});

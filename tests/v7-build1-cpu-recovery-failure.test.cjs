'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const KEY='hitlab-v7-visual-prototype-only';
const URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
test('CPU recovery backs up exact bytes and refuses destructive discard when backup fails',async()=>{
 const browser=await chromium.launch();
 try{for(const failBackup of [false,true]){
 const page=await browser.newPage();
 await page.goto(URL);
 await page.evaluate(({key,fail})=>{
  localStorage.setItem(key,'{broken');
  localStorage.setItem('warriors-hit-lab-v4','legacy');
  if(fail)sessionStorage.setItem('failBackup','yes');
 },{key:KEY,fail:failBackup});
 await page.addInitScript(()=>{if(sessionStorage.getItem('failBackup')){const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes(':recovery:'))throw new Error('quota');return set.call(this,k,v)}}});
 await page.reload();
 await page.locator('#discardRecovery').click();await page.locator('#confirmDiscardRecovery').click();
 const data=await page.evaluate(key=>({raw:localStorage.getItem(key),backups:Object.keys(localStorage).filter(k=>k.startsWith(key+':recovery:')).map(k=>localStorage.getItem(k)),legacy:localStorage.getItem('warriors-hit-lab-v4')}),KEY);
 assert.equal(data.legacy,'legacy');
 if(failBackup){assert.equal(data.raw,'{broken');assert.match(await page.locator('#page').innerText(),/Unable to back up/)}
 else{assert.equal(data.raw,null);assert.deepEqual(data.backups,['{broken'])}
 await page.close();
 }}finally{await browser.close()}
});
test('CPU save writes schema and a failed swing write gates further recording without browser errors',async()=>{
 const browser=await chromium.launch();
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(URL);await page.locator('[data-go="Play"]').first().click();await page.locator('[data-go="Game"]').first().click();
 const raw=await page.evaluate(key=>localStorage.getItem(key),KEY);assert.equal(JSON.parse(raw).schemaVersion,1);
 await page.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new Error('quota');return set.call(this,k,v)}},KEY);
 await page.locator('#swing').click();
 await page.waitForTimeout(1200);
 assert.match(await page.locator('#page').innerText(),/Saving failed/);assert.equal(await page.locator('#swing').count(),0);
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw);assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
test('CPU swing exception stops recording visibly and retains saved bytes',async()=>{
 const browser=await chromium.launch();
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(URL);await page.locator('[data-go="Play"]').first().click();await page.locator('[data-go="Game"]').first().click();
 const raw=await page.evaluate(key=>localStorage.getItem(key),KEY);
 await page.evaluate(()=>{Math.random=()=>0;window.HitLabBaseRules={...window.HitLabBaseRules,advance(){throw new Error('injected engine failure')}}});
 await page.locator('#swing').click();
 assert.match(await page.locator('#page').innerText(),/Recording stopped/);assert.equal(await page.locator('#swing').count(),0);
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw);assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});

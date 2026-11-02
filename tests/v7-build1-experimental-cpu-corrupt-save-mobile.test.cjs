'use strict';
// Isolated experimental save regression; no writes to production or legacy keys.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const GAME_URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
const KEY='hitlab-v7-visual-prototype-only';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const bad=['{not-json','[]','{"outs":-3}','{"bases":[true]}','{"schemaVersion":99}','{"reps":"bad"}','{"log":{}}','null'];
for(const [name,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': corrupt experimental CPU saves are preserved byte-exact at 375x667',async()=>{
  const browser=await browserType.launch({headless:true});
  try{
   for(const raw of bad){
    const context=await browser.newContext({viewport:{width:375,height:667}});
    const page=await context.newPage();
    await page.addInitScript(({key,raw,legacy,snapshot})=>{
     localStorage.setItem(key,raw);
     localStorage.setItem('warriors-hit-lab-v4',legacy);
     localStorage.setItem('warriors-hit-lab-v6-snapshot',snapshot);
    },{key:KEY,raw,legacy:'{"career":"cpu-recovery-sentinel"}',snapshot:'{"snapshot":"cpu-recovery-sentinel"}'});
    await page.goto(GAME_URL);
    await page.locator('[data-go="Play"]').first().click();
    await page.locator('[data-go="Game"]').first().click();
    const values=await page.evaluate(([key,legacy,snapshot])=>[localStorage.getItem(key),localStorage.getItem(legacy),localStorage.getItem(snapshot)],[KEY,LEGACY,SNAPSHOT]);
    assert.deepEqual(values,[raw,'{"career":"cpu-recovery-sentinel"}','{"snapshot":"cpu-recovery-sentinel"}']);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await context.close();
   }
  }finally{await browser.close()}
 });
}

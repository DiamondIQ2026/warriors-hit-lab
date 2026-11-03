'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';

for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 test('invalid V7 saves are preserved, quarantined and cannot overwrite other saves: '+label,async()=>{
  const browser=await engine.launch();
  try{
   const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
   try{
    await page.goto(URL);
    const sentinel='KEEP_V63_BYTES',other='KEEP_UNRELATED_BYTES';
    await page.evaluate(([k,v,s,o])=>{
     localStorage.setItem(k,v);
     localStorage.setItem('hitlab-v63-career-sentinel',s);
     localStorage.setItem('unrelated-qa-sentinel',o);
    },[KEY,'{invalid-json',sentinel,other]);
    await page.reload();
    assert.equal(await page.locator('#saveRecovery').isVisible(),true);
    assert.equal(await page.locator('#saveRecoveryExport').isVisible(),true);
    assert.equal(await page.locator('#saveRecoveryDiscard').isVisible(),true);
    assert.equal(await page.locator('#start').isDisabled(),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),'{invalid-json');
    await page.reload();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),'{invalid-json');
    assert.equal(await page.locator('#saveRecovery').isVisible(),true);
    // Do not click the destructive discard action: only the user may authorize it.
    assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),sentinel);
    assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),other);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   }finally{await page.close();}
  }finally{await browser.close();}
 });
}

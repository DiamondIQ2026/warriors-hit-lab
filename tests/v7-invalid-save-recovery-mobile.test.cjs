'use strict';
// Recovery must never unlock a new match while invalid V7 bytes still exist.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [name,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 for(const [width,height] of [[375,667],[390,844]]){
  test(`${name} ${width}x${height}: invalid V7 recovery requires verified removal before a fresh full game`,{timeout:90000},async()=>{
   const browser=await browserType.launch();
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(URL);
    const invalid='{"version":999,"corrupt":true}';
    await page.evaluate(({key,invalid})=>{
     localStorage.setItem(key,invalid);
     localStorage.setItem('v6.3-recovery-sentinel','untouched');
    },{key:KEY,invalid});
    await page.reload();
    assert.equal(await page.locator('#start').isDisabled(),true);
    await page.evaluate(()=>{
     window.confirm=()=>true;
     const original=Storage.prototype.removeItem;
     window.__restoreRemove=()=>{Storage.prototype.removeItem=original;};
     Storage.prototype.removeItem=function(key){
      if(key==='warriors-hit-lab-v7-multiplayer-prototype')return;
      return original.call(this,key);
     };
    });
    await page.locator('#saveRecoveryDiscard').click();
    assert.equal(await page.locator('#start').isDisabled(),true,'silent removal failure cannot unlock setup');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),invalid);
    assert.match(await page.locator('#saveRecovery').innerText(),/Could not verify removal/);
    await page.evaluate(()=>window.__restoreRemove());
    await page.locator('#saveRecoveryDiscard').click();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),null);
    assert.equal(await page.locator('#start').isEnabled(),true);
    await page.locator('#innings').selectOption('3');
    await page.locator('#start').click();
    assert.equal(await page.locator('#game').isVisible(),true);
    await page.locator('#turn').click();
    await page.locator('#zones button').first().click();
    await page.locator('#record').click();
    const saved=await page.evaluate(key=>localStorage.getItem(key),KEY);
    assert.equal(JSON.parse(saved).atBats.length,1);
    await page.reload();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),saved);
    assert.equal(await page.evaluate(()=>localStorage.getItem('v6.3-recovery-sentinel')),'untouched');
    assert.deepEqual(errors,[]);
   }finally{await context.close();await browser.close();}
  });
 }
}

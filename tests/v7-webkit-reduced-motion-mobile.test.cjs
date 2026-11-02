'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webkit}=require('playwright');

const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const V7_KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY_KEY='warriors-hit-lab-v4';

// Automated Linux WebKit coverage only. Physical iPhone/Safari acceptance is separate.
test('WebKit 375/390px reduced-motion outcome, reload and legacy-save isolation',async()=>{
 const browser=await webkit.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({
    viewport:{width,height},isMobile:true,hasTouch:true,
    reducedMotion:'reduce',serviceWorkers:'block'
   });
   const page=await context.newPage();
   const pageErrors=[];
   page.on('pageerror',error=>pageErrors.push(error.message));
   try{
    await page.goto(URL);
    await page.evaluate(key=>localStorage.setItem(key,'v6.3-webkit-reduced-motion-sentinel'),LEGACY_KEY);
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
    await page.locator('#start').tap();
    await page.locator('#turn').tap();
    await page.locator('#zones button').nth(4).tap();
    await page.locator('#outcome').selectOption('single');
    await page.locator('#record').tap();

    assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'single');
    const marker=await page.locator('.simulated-field .outcome-ball').evaluate(el=>{
     const css=getComputedStyle(el);
     return {display:css.display,animationName:css.animationName};
    });
    assert.notEqual(marker.display,'none','WebKit must show simulated result');
    assert.equal(marker.animationName,'none','WebKit reduced-motion must suppress flight animation');
    assert.match(await page.locator('#fieldOutcome').innerText(),/SINGLE/);

    const before=await page.evaluate(key=>localStorage.getItem(key),V7_KEY);
    const saved=JSON.parse(before);
    assert.equal(saved.atBats.length,1);
    assert.equal(saved.atBats[0].outcome,'single');
    assert.deepEqual(saved.bases,[true,false,false]);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_KEY),'v6.3-webkit-reduced-motion-sentinel');

    await page.reload();
    assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'single');
    assert.equal(await page.locator('.simulated-field .outcome-ball').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),V7_KEY),before,'reload must not rewrite the V7 save');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_KEY),'v6.3-webkit-reduced-motion-sentinel');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow');
    assert.deepEqual(pageErrors,[],'no uncaught page errors');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
});

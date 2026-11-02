'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const V7_KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY_KEY='warriors-hit-lab-v4';

test('375/390px reduced-motion field preserves outcome, runner and legacy saves',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({
    viewport:{width,height},isMobile:true,hasTouch:true,
    reducedMotion:'reduce',serviceWorkers:'block'
   });
   const page=await context.newPage();
   try{
    await page.goto(URL);
    await page.evaluate(key=>localStorage.setItem(key,'v6.3-reduced-motion-sentinel'),LEGACY_KEY);
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
    await page.locator('#start').tap();
    await page.locator('#turn').tap();
    await page.locator('#zones button').nth(4).tap();
    await page.locator('#outcome').selectOption('single');
    await page.locator('#record').tap();

    const field=page.locator('.simulated-field');
    assert.equal(await field.getAttribute('data-outcome'),'single');
    const ball=await page.locator('.simulated-field .outcome-ball').evaluate(el=>{
     const css=getComputedStyle(el);
     return {display:css.display,animationName:css.animationName,animationDuration:css.animationDuration};
    });
    assert.notEqual(ball.display,'none','simulated result marker remains visible');
    assert.equal(ball.animationName,'none','reduced-motion suppresses field flight animation');
    assert.match(await page.locator('#fieldOutcome').innerText(),/SINGLE/);

    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),V7_KEY);
    assert.equal(saved.atBats.length,1);
    assert.equal(saved.atBats[0].outcome,'single');
    assert.deepEqual(saved.bases,[true,false,false]);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_KEY),'v6.3-reduced-motion-sentinel');

    await page.reload();
    assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'single');
    assert.equal(await page.locator('.simulated-field .outcome-ball').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).atBats.length,V7_KEY),1);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_KEY),'v6.3-reduced-motion-sentinel');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
});

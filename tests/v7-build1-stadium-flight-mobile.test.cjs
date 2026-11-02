'use strict';
// Standalone V7 stadium/flight acceptance: synthetic data only, never real saves.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/preview.html';
const LEGACY='warriors-hit-lab-v4';
const V7='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': 375/390px Tropicana simulation, fielder reaction, replay and isolation',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL+'?zone=MC&contact=hard&outcome=single&hand=R');
    await page.evaluate(([key,value])=>localStorage.setItem(key,value),[LEGACY,'{"legacy":"unchanged"}']);
    assert.match(await page.locator('#field').textContent(),/TROPICANA FIELD/);
    assert.equal(await page.locator('[data-fielder]').count(),6);
    assert.equal(await page.locator('#zone').inputValue(),'MC');
    assert.equal(await page.locator('#outcome').inputValue(),'single');
    await page.locator('#play').tap();
    assert.match(await page.locator('#result').innerText(),/Single · Simulation complete/);
    assert.match(await page.locator('#fielderStatus').innerText(),/reacted to the simulated ball/);
    assert.equal(await page.locator('[data-fielder][data-react="lead"]').count(),1);
    const first=await page.locator('#trail').getAttribute('points');
    const ballR=Number(await page.locator('#ball').getAttribute('cx'));
    assert.ok(first&&first.split(' ').length>30,'full smooth flight trail');
    const lead=page.locator('[data-fielder][data-react="lead"]');
    assert.notEqual(await lead.getAttribute('transform'),'translate(0.00 0.00)','fielder moves toward ball');
    await page.locator('#replay').tap();
    assert.equal(await page.locator('#trail').getAttribute('points'),first,'identical inputs reproduce same path');
    await page.locator('#hand').selectOption('L');
    await page.locator('#play').tap();
    const ballL=Number(await page.locator('#ball').getAttribute('cx'));
    assert.ok(ballL>ballR,'handedness changes simulated pull direction');
    await page.locator('#outcome').selectOption('homer');
    await page.locator('#skip').tap();
    // Skip finishes the current flight; a new Play uses the changed outcome.
    await page.locator('#play').tap();
    assert.match(await page.locator('#result').innerText(),/Home run · Simulation complete/);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),'{"legacy":"unchanged"}');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),V7),null,'preview never creates a match');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
    assert.deepEqual(errors,[],'no browser errors at '+width+'px');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

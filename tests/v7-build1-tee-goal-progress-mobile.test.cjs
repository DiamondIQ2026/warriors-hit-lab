'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('real tee practice goal progress is per player, adjustable and save-safe '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#trainingInsights > summary').tap();
     assert.equal(await page.locator('.tee-goal-row').count(),2);
     assert.match(await page.locator('.tee-goal-row').first().innerText(),/0 \/ 20 real tee swings/);
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#record').tap();
     assert.match(await page.locator('.tee-goal-row').first().innerText(),/1 \/ 20 real tee swings/);
     assert.equal(await page.locator('.tee-goal-row').first().locator('[role=progressbar]').getAttribute('aria-valuenow'),'1');
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.locator('#teeGoal').selectOption('10');
     assert.match(await page.locator('.tee-goal-row').first().innerText(),/1 \/ 10 real tee swings/);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     await page.reload();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('.tee-goal-row').first().innerText(),/1 \/ 20 real tee swings/);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

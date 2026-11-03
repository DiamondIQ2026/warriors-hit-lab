'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('complete real tee coaching dashboard persists without changing game saves '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,acceptDownloads:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#recordAfterChoices').tap();
     await page.locator('#trainingInsights > summary').tap();
     assert.equal(await page.locator('.training-heatmap-cell').count(),18);
     assert.equal(await page.locator('.tee-goal-row').count(),2);
     assert.equal(await page.locator('.guided-tee-drill').count(),2);
     assert.equal(await page.locator('.practice-coverage-row').count(),2);
     assert.equal(await page.locator('.tee-milestone-player').count(),2);
     assert.match(await page.locator('.tee-milestone-player').first().innerText(),/First Rep/);
     assert.match(await page.locator('.practice-coverage-row').first().innerText(),/1 \/ 9 zones practiced/);
     assert.match(await page.locator('.tee-goal-row').first().innerText(),/1 \/ 20 real tee swings/);
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.locator('#teeGoal').selectOption('30');
     assert.match(await page.locator('.tee-goal-row').first().innerText(),/1 \/ 30 real tee swings/);
     const downloadPromise=page.waitForEvent('download');
     await page.locator('#exportPracticeCsv').tap();
     assert.equal((await downloadPromise).suggestedFilename(),'warriors-hit-lab-v7-tee-practice.csv');
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     await page.reload();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('.tee-milestone-player').first().innerText(),/First Rep/);
     assert.match(await page.locator('.practice-coverage-row').first().innerText(),/1 \/ 9 zones practiced/);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

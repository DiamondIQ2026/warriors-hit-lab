'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('two player 3x3 practice heatmaps show real zone reps and survive reload '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#trainingInsights > summary').tap();
     assert.equal(await page.locator('.training-heatmap').count(),2);
     assert.equal(await page.locator('.training-heatmap-cell').count(),18);
     assert.equal(await page.locator('.training-heatmap-cell').nth(4).locator('strong').innerText(),'0');
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#recordAfterChoices').tap();
     assert.equal(await page.locator('.training-heatmap-cell').nth(4).locator('strong').innerText(),'1');
     assert.match(await page.locator('.training-heatmap-cell').nth(4).getAttribute('aria-label'),/Zone 5: 1 actual tee swings/);
     assert.equal(await page.locator('.training-heatmap-cell').nth(13).locator('strong').innerText(),'0');
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await page.locator('#trainingInsights > summary').tap();
     assert.equal(await page.locator('.training-heatmap-cell').nth(4).locator('strong').innerText(),'1');
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

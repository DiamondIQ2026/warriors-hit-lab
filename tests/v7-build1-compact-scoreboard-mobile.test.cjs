'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('compact live R-H-O strip updates after real swings and reloads at mobile widths '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     assert.equal(await page.locator('#quickAwayLine').innerText(),'0 · 0 · 0');
     assert.equal(await page.locator('#quickHomeLine').innerText(),'0 · 0 · 0');
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#recordAfterChoices').tap();
     assert.equal(await page.locator('#quickAwayLine').innerText(),'0 · 1 · 0');
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('homer');
     await page.locator('#recordAfterChoices').tap();
     assert.equal(await page.locator('#quickAwayLine').innerText(),'2 · 2 · 0');
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     assert.equal(await page.locator('#quickAwayLine').innerText(),'2 · 2 · 0');
     assert.equal(await page.locator('#quickHomeLine').innerText(),'0 · 0 · 0');
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

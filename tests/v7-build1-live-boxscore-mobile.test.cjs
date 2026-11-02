'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 test('V7 '+name+' 375/390 mobile live box score updates and reloads without altering save',async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,667],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     const panel=page.locator('#liveBoxScore');
     await panel.locator(':scope > summary').tap();
     assert.equal(await panel.evaluate(e=>e.open),true);
     const rows=page.locator('#boxScoreRows tr');
     assert.equal(await rows.count(),2);
     assert.equal(await rows.nth(0).locator('td').nth(10).innerText(),'0');
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#recordAfterChoices').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('homer');
     await page.locator('#recordAfterChoices').tap();
     assert.equal(await rows.nth(0).locator('td').nth(1).innerText(),'2');
     assert.equal(await rows.nth(0).locator('td').nth(10).innerText(),'2');
     assert.equal(await rows.nth(0).locator('td').nth(11).innerText(),'2');
     const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await panel.locator(':scope > summary').tap();
     assert.equal(await rows.nth(0).locator('td').nth(10).innerText(),'2');
     assert.equal(await rows.nth(0).locator('td').nth(11).innerText(),'2');
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });
}

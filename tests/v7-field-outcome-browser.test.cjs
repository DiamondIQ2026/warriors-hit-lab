'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('375px recorded simulated hit updates 2D field and survives reload without CPU save changes',async()=>{
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
 await page.locator('#start').tap();
 assert.match(await page.locator('#fieldOutcome').textContent(),/Awaiting simulated result/);
 await page.locator('#turn').tap();
 await page.locator('#zones button').nth(4).tap();
 await page.locator('#outcome').selectOption('double');
 await page.locator('#record').tap();
 assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
 assert.match(await page.locator('#fieldOutcome').textContent(),/DOUBLE/);
 const snapshot=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
 await page.reload();
 assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
 assert.match(await page.locator('#fieldOutcome').textContent(),/DOUBLE/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),snapshot);
 assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});
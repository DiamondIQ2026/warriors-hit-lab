'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile 2D field remains legible and last outcome persists after reload',async()=>{
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
 await page.locator('#start').tap();
 await page.locator('#turn').tap();
 await page.locator('#zones button').nth(4).tap();
 await page.locator('#outcome').selectOption('homer');
 await page.locator('#record').tap();
 const field=page.locator('.simulated-field'),ball=field.locator('.outcome-ball');
 assert.equal(await field.getAttribute('data-outcome'),'homer');
 assert.equal(await ball.isVisible(),true);
 const style=await ball.evaluate(el=>({width:getComputedStyle(el).width,shadow:getComputedStyle(el).boxShadow}));
 assert.ok(parseFloat(style.width)>=14);assert.notEqual(style.shadow,'none');
 assert.match(await page.locator('#fieldOutcome').textContent(),/HOMER/);
 const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
 await page.reload();
 assert.equal(await field.getAttribute('data-outcome'),'homer');
 assert.equal(await ball.isVisible(),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
 assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});
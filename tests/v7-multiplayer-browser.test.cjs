'use strict';
// Browser integration for isolated V7 multiplayer prototype only.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
test('two players alternate after three recorded outs; reload preserves turn and stats',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE);
 await page.locator('#start').click();
 assert.match(await page.locator('#turn').innerText(),/MADDON/);
 await page.locator('#turn').click();
 for(let i=0;i<3;i++){
  await page.locator('#zones button').first().click();
  await page.locator('#outcome').selectOption('out');
  await page.locator('#record').click();
 }
 assert.match(await page.locator('#turn').innerText(),/DAD/);
 let data=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(data.realSwings.maddon,3);
 assert.equal(data.realSwings.dad,0);
 assert.equal(data.half,'bottom');
 assert.equal(data.outs,0);
 await page.reload();
 assert.match(await page.locator('#turn').innerText(),/DAD/);
 await page.locator('#turn').click();
 await page.locator('#zones button').first().click();
 await page.locator('#record').click();
 data=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(data.realSwings.dad,1);
 assert.equal(data.atBats.length,4);
 assert.deepEqual(errors,[]);
 await context.close();
 }finally{await browser.close()}
});
test('separate multiplayer save never creates or overwrites legacy career key',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
 const page=await context.newPage();
 await page.goto(BASE);
 await page.locator('#start').click();
 const keys=await page.evaluate(()=>Object.keys(localStorage));
 assert.ok(keys.includes(KEY));
 assert.equal(keys.includes('warriors-hit-lab-v4'),false);
 await context.close();
 }finally{await browser.close()}
});

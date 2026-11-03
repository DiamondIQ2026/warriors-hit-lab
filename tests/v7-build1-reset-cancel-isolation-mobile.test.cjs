'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
for(const [browserName,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+browserName+': reset cancel preserves game and legacy data; explicit reset only removes V7',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    await page.goto(URL);
    await page.evaluate(([key,val])=>localStorage.setItem(key,val),[LEGACY,'v6.3-safe-sentinel']);
    await page.locator('#start').tap();
    await page.locator('#turn').tap();
    await page.locator('#zones button').nth(4).tap();
    await page.locator('#record').tap();
    const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
    assert.ok(saved&&JSON.parse(saved).atBats.length===1);
    page.once('dialog',d=>d.dismiss());
    await page.locator('#reset').tap();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),'v6.3-safe-sentinel');
    page.once('dialog',d=>d.accept());
    await page.locator('#reset').tap();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),'v6.3-safe-sentinel');
    assert.equal(await page.locator('#start').isVisible(),true);
    await page.close();
   }
  }finally{await browser.close();}
 });
}

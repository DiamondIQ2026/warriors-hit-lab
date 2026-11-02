'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('restoring a saved game never animates old swings but the next swing animates, on both phones',async()=>{
 const browser=await chromium.launch();
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();await page.locator('#turn').tap();
  const swing=async()=>{await page.locator('#zones button').nth(4).tap();await page.locator('#outcome').selectOption('double');await page.locator('#record').tap();};
  await swing();
  const ball=page.locator('.simulated-field .outcome-ball');
  assert.equal(await ball.evaluate(el=>getComputedStyle(el).animationName),'hitlab-field-flight');
  const before=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
  await page.reload();
  assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
  assert.equal(await ball.evaluate(el=>getComputedStyle(el).animationName),'none','restored result should be static');
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),before);
  if((await page.locator('#turn').textContent()).includes('PASS PHONE'))await page.locator('#turn').tap();
  await swing();
  assert.equal(await ball.evaluate(el=>getComputedStyle(el).animationName),'hitlab-field-flight');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await ball.evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
  await page.close();
 }
 }finally{await browser.close();}
});
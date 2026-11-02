'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('live phone game compresses development heading while setup retains the disclaimer',async()=>{
 const browser=await chromium.launch();
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  assert.equal(await page.locator('.development-heading .muted').isVisible(),true);
  await page.locator('#start').tap();
  assert.equal(await page.locator('.development-heading .muted').isVisible(),false);
  assert.equal(await page.locator('.development-heading h1').isVisible(),true);
  assert.equal(await page.locator('.development-heading small').isVisible(),true);
  await page.locator('#turn').tap();
  const r=await page.locator('#record').boundingBox();
  assert.ok(r&&r.y>=0&&r.y+r.height<=height,'CTA above fold');
  assert.equal(await page.locator('.practice-card #zones button').count(),9);
  assert.equal(await page.locator('.simulation-module #outcome').count(),1);
  await page.locator('#zones button').nth(4).tap();
  await page.locator('#outcome').selectOption('double');
  await page.locator('#record').tap();
  assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'double');
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
  await page.close();
 }
 }finally{await browser.close();}
});
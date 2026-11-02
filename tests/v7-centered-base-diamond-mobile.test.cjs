'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('metallic scorebug tracks first and second base after two singles and reload at mobile widths',async()=>{
 const browser=await chromium.launch();
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();
  const diamond=page.locator('.score .score-diamond');
  assert.equal(await diamond.getAttribute('aria-label'),'Bases occupied: none');
  await page.locator('#turn').tap();
  for(let i=0;i<2;i++){
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('single');
   await page.locator('#record').tap();
  }
  const count=await diamond.locator('i.occupied').count();
  assert.equal(count,2);
  assert.equal(await diamond.getAttribute('aria-label'),'Bases occupied: 1, 2');
  const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
  await page.reload();
  assert.equal(await diamond.locator('i.occupied').count(),2);
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
  await page.close();
 }
 }finally{await browser.close();}
});
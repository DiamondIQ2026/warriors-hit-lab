'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile simulated 2D field preserves handoff, nine-zone controls and save isolation',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();
  const handoff=page.locator('#turn');
  assert.equal(await handoff.isVisible(),true);
  const card=page.locator('.simulated-field-card');
  assert.equal(await card.isVisible(),true);
  assert.match(await card.getAttribute('aria-label'),/Simulated baseball field/);
  assert.equal(await page.locator('.simulated-field').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('.simulated-field .infield').count(),1);
  await handoff.tap();
  const zones=page.locator('#zones button');
  assert.equal(await zones.count(),9);
  await zones.nth(4).tap();
  await page.locator('#outcome').selectOption('single');
  await page.locator('#record').tap();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.equal(saved.atBats.length,1);
  await page.reload();
  assert.equal(await page.locator('.simulated-field-card').isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'))),saved);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});
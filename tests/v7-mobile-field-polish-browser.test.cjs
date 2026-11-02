'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('mobile field and feedback visual refinement retain touch gameplay, primary CTA and saves',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/v7/experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  const field=page.locator('#ballfield');
  assert.equal(await field.isVisible(),true);
  assert.match(await field.getAttribute('aria-label'),/simulated field/);
  const fieldStyle=await field.evaluate(el=>getComputedStyle(el).boxShadow);
  assert.notEqual(fieldStyle,'none');
  assert.equal(await page.locator('.quick-zone button').count(),9);
  const button=page.locator('.quick-zone button').nth(4);
  assert.ok((await button.boundingBox()).height>=44);
  const cta=await page.locator('#swing').boundingBox();
  assert.ok(cta&&cta.y>=0&&cta.y+cta.height<=812,'main swing CTA above fold');
  await button.tap();
  await page.locator('#swing').tap();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('hitlab-v7-visual-prototype-only')));
  assert.equal(state.zone,5);
  assert.equal(state.reps,1);
  await page.reload();
  await page.locator('#resumeGame').click();
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('hitlab-v7-visual-prototype-only')));
  assert.equal(persisted.reps,1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),null);
 }finally{await browser.close();}
});
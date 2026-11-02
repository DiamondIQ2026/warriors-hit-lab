'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('six-entry phone navigation remains readable, correctly labeled and preserves disabled destinations',async()=>{
 const browser=await chromium.launch();
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();
  const nav=page.locator('.v7-nav');
  assert.equal(await nav.locator(':scope > a, :scope > span.nav-disabled').count(),6);
  assert.equal(await nav.locator('a[aria-current="page"]').count(),1);
  assert.equal(await nav.locator('span.nav-disabled').count(),3);
  const labels=await nav.locator(':scope > a, :scope > span.nav-disabled').allTextContents();
  assert.deepEqual(labels.map(x=>x.trim().replace(/^[^A-Za-z]+/,'')),['Home','Play','Academy','Season','Cup','Team']);
  const metrics=await nav.locator('a[aria-current="page"]').evaluate(el=>({fontSize:parseFloat(getComputedStyle(el).fontSize),height:el.getBoundingClientRect().height}));
  assert.ok(metrics.fontSize>=11&&metrics.height>=54,JSON.stringify({width,metrics}));
  const disabled=await nav.locator('span.nav-disabled').first().evaluate(el=>getComputedStyle(el).opacity);
  assert.equal(Number(disabled),1);
  await page.locator('#turn').tap();
  await page.locator('#zones button').nth(4).tap();
  await page.locator('#outcome').selectOption('single');
  await page.locator('#record').tap();
  assert.equal(await page.locator('.score-diamond i.occupied').count(),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
  await page.close();
 }
 }finally{await browser.close();}
});
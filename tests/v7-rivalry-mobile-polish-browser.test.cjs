'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('375px Family Rivalry metallic scorebug, phone handoff, navigation and swing remain accessible after reload',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();
  const score=page.locator('.score');
  assert.equal(await score.isVisible(),true);
  assert.match(await score.evaluate(el=>getComputedStyle(el).backgroundImage),/linear-gradient/);
  assert.equal(await page.locator('#awayScore').isVisible(),true);
  assert.equal(await page.locator('#homeScore').isVisible(),true);
  const handoff=page.locator('#turn'),bounds=await handoff.boundingBox();
  assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=812,'handoff above the fold');
  assert.ok(bounds.height>=44,'handoff meets touch height');
  await handoff.tap();
  const zones=page.locator('#zones button');
  assert.equal(await zones.count(),9);
  for(let i=0;i<9;i++)assert.match(await zones.nth(i).getAttribute('aria-label'),/Net impact zone/);
  await zones.nth(4).tap();
  await page.locator('#outcome').selectOption('single');
  await page.locator('#record').tap();
  const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.equal(first.atBats.length,1);
  await page.reload();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.deepEqual(after,first);
  assert.ok(await page.locator('.v7-nav a').count()>0,'navigation links remain present');
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});
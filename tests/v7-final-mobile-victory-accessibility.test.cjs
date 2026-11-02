'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:8765/v7/',R='warriors-hit-lab-v7-multiplayer-prototype',C='hitlab-v7-visual-prototype-only';
test('375px Family Rivalry bottom final third out settles visitor victory and retains scoreboard after reload',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  await page.goto(ROOT+'multiplayer.html');
  await page.locator('#start').tap();
  await page.evaluate(key=>{
   const m=JSON.parse(localStorage.getItem(key));
   m.inning=3;m.half='bottom';m.outs=2;
   m.score[m.away.id]=6;m.score[m.home.id]=1;
   localStorage.setItem(key,JSON.stringify(m));
  },R);
  await page.reload();
  if(await page.locator('#turn').isVisible())await page.locator('#turn').tap();
  const zones=page.locator('#zones button');
  assert.equal(await zones.count(),9);
  await zones.nth(4).tap();
  await page.locator('#outcome').selectOption('out');
  await page.locator('#record').tap();
  const m=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),R);
  assert.equal(m.status,'final');assert.equal(m.winner,m.away.id);
  assert.equal(await page.locator('.score').isVisible(),true);
  await page.reload();
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),R),m);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),C),null);
 }finally{await browser.close();}
});
test('375px CPU controls preserve visible accessible keyboard zone and avoid accidental rivalry writes',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(ROOT+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  const zones=page.locator('.quick-zone button');
  assert.equal(await zones.count(),9);
  await zones.nth(0).focus();await page.keyboard.press('Enter');
  assert.equal(await zones.nth(0).getAttribute('aria-pressed'),'true');
  const rect=await page.locator('#swing').boundingBox();
  assert.ok(rect&&rect.y>=0&&rect.y+rect.height<=812);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),R),null);
 }finally{await browser.close();}
});
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/';
test('CPU live swing exposes a normalized transition, preserves isolated game save',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(BASE+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  await page.locator('#swing').click();
  const state=await page.evaluate(()=>({transition:window.__hitLabLastTransition,cpu:JSON.parse(localStorage.getItem('hitlab-v7-visual-prototype-only')),rivalry:localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')}));
  assert.equal(state.transition.mode,'cpu');
  assert.equal(state.transition.to.inning,state.cpu.inning);
  assert.equal(state.transition.to.outs,state.cpu.outs);
  assert.equal(state.transition.to.home,state.cpu.home);
  assert.equal(state.transition.to.away,state.cpu.away);
  assert.equal(state.rivalry,null);
  await context.close();
 }finally{await browser.close();}
});
test('Family Rivalry swing exposes normalized transition without rewriting another mode',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(BASE+'multiplayer.html');
  await page.locator('#start').click();
  await page.locator('#turn').click();
  await page.locator('#zones button').first().click();
  await page.locator('#outcome').selectOption('single');
  await page.locator('#record').click();
  const state=await page.evaluate(()=>({transition:window.__hitLabLastTransition,match:JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),cpu:localStorage.getItem('hitlab-v7-visual-prototype-only')}));
  assert.equal(state.transition.mode,'rivalry');
  assert.equal(state.transition.to.inning,state.match.inning);
  assert.equal(state.transition.to.half,state.match.half);
  assert.equal(state.transition.to.outs,state.match.outs);
  assert.equal(state.transition.to.away,state.match.score.maddon);
  assert.equal(state.cpu,null);
  await context.close();
 }finally{await browser.close();}
});
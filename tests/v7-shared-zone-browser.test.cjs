'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/';
test('CPU zone selection uses shared zone rules before recording swing',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(BASE+'experimental/visual-prototype.html');
  assert.equal(await page.evaluate(()=>window.HitLabZoneRules.label(5)),'MC');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  await page.locator('[data-zone="5"]').first().click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hitlab-v7-visual-prototype-only')).zone),5);
 }finally{await browser.close();}
});
test('Family Rivalry zone selection preserves canonical label in swing event',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(BASE+'multiplayer.html');
  assert.equal(await page.evaluate(()=>window.HitLabZoneRules.number('MC')),5);
  await page.locator('#start').click();
  await page.locator('#turn').click();
  await page.locator('#zones button').nth(4).click();
  await page.locator('#record').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
  assert.equal(saved.atBats.at(-1).zone,'MC');
 }finally{await browser.close();}
});

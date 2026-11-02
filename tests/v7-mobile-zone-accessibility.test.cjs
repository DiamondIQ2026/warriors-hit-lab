'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('375px CPU gameplay zones have unique accessible names and keyboard selection',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto('http://127.0.0.1:8765/v7/experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  const zones=page.locator('.quick-zone button[data-zone]');
  assert.equal(await zones.count(),9);
  for(let n=1;n<=9;n++){
   const button=zones.nth(n-1);
   assert.equal(await button.getAttribute('aria-label'),'Batting zone '+n+' of 9');
   assert.equal(await button.getAttribute('type'),'button');
  }
  await zones.nth(4).focus();
  await page.keyboard.press('Enter');
  assert.equal(await zones.nth(4).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#swing').isVisible(),true);
 }finally{await browser.close();}
});
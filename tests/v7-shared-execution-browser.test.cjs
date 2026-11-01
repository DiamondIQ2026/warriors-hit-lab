'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/';
for(const [mode,route] of [['cpu','experimental/visual-prototype.html'],['rivalry','multiplayer.html']]){
 test(mode+' has shared execution adapter available during live browser play',async()=>{
  const browser=await chromium.launch();
  try{
   const page=await browser.newPage();
   await page.goto(BASE+route);
   assert.equal(await page.evaluate(()=>typeof window.HitLabExecution?.execute),'function');
   if(mode==='cpu'){
    await page.locator('[data-go="Play"]').first().click();
    await page.locator('[data-go="Game"]').first().click();
    await page.locator('#swing').click();
   }else{
    await page.locator('#start').click();
    await page.locator('#turn').click();
    await page.locator('#zones button').first().click();
    await page.locator('#outcome').selectOption('single');
    await page.locator('#record').click();
   }
   assert.equal(await page.evaluate(()=>window.__hitLabLastTransition?.mode),mode);
  }finally{await browser.close();}
 });
}

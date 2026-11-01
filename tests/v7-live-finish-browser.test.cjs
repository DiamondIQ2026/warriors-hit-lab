'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765/v7/';
test('Family Rivalry browser shares final and extra-inning decisions without changing saved schema',async()=>{
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage();
 await page.goto(base+'multiplayer.html');
 await page.locator('#start').click();
 const state=await page.evaluate(()=>{
   const api=window.HitLabMultiplayer, rules=window.HitLabFinishRules;
   const start=JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
   const extra=rules.decision({inning:3,scheduled:3,half:'bottom',home:2,away:2,thirdOut:true});
   return {start,extra,opponent:localStorage.getItem('hitlab-v7-visual-prototype-only')};
 });
 assert.equal(state.start.version,1);
 assert.equal(state.extra.kind,'next-inning');
 assert.equal(state.opponent,null);
 }finally{await browser.close();}
});
test('CPU browser shares final decision while preserving mode-specific save key',async()=>{
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage();
 await page.goto(base+'experimental/visual-prototype.html');
 await page.locator('[data-go="Play"]').first().click();
 await page.locator('[data-go="Game"]').first().click();
 const result=await page.evaluate(()=>({
  homeLead:window.HitLabFinishRules.decision({inning:3,scheduled:3,half:'top',home:4,away:3,thirdOut:true}).kind,
  cpu:JSON.parse(localStorage.getItem('hitlab-v7-visual-prototype-only')),
  rivalry:localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')
 }));
 assert.equal(result.homeLead,'final');assert.equal(result.cpu.gameStarted,true);assert.equal(result.rivalry,null);
 }finally{await browser.close();}
});
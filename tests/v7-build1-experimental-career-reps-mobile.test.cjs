'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
const KEY='hitlab-v7-visual-prototype-only';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': career real tee reps survive new game and reload',async()=>{
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:375,height:667}});
   await page.goto(URL);
   await page.locator('[data-go="Play"]').first().click();
   await page.locator('[data-go="Game"]').first().click();
   await page.locator('#swing').click();
   await page.waitForFunction(k=>{const d=JSON.parse(localStorage.getItem(k)||'{}');return d.careerTeeReps===1},KEY);
   let saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.equal(saved.reps,1);
   assert.equal(saved.careerTeeReps,1);
   await page.reload();
   await page.locator('[data-go="Play"]').first().click();
   await page.locator('[data-go="Game"]').first().click();
   saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.equal(saved.reps,0);
   assert.equal(saved.careerTeeReps,1);
   await page.locator('#swing').click();
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)||'{}').careerTeeReps===2,KEY);
   saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.equal(saved.reps,1);
   assert.equal(saved.careerTeeReps,2);
  }finally{await browser.close()}
 });
}

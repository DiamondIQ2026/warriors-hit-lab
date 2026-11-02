'use strict';
// Build 1: real browser checks for experimental CPU and Family Rivalry scoring.
// The combined GitHub workflow also runs the full 3/6/9-inning multiplayer suite.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
const KEY='hitlab-v7-visual-prototype-only';
const LEGACY='warriors-hit-lab-v4';
const SENTINEL='{"v6.3":"leave-byte-exact"}';
async function setup(page,patch){
 await page.goto(URL);
 await page.locator('[data-go="Play"]').first().click();
 await page.locator('[data-go="Game"]').first().click();
 await page.evaluate(({key,patch,legacy,sentinel})=>{
  const original=JSON.parse(localStorage.getItem(key));
  localStorage.setItem(key,JSON.stringify({...original,...patch,screen:'Home',animating:false,gameStarted:true,gameFinished:false,finalReason:''}));
  localStorage.setItem(legacy,sentinel);
 },{key:KEY,patch,legacy:LEGACY,sentinel:SENTINEL});
 await page.reload();
 await page.locator('#resumeGame').first().click();
}
async function recorded(page,rolls){
 await page.evaluate(rolls=>{window.__hitLabTestRolls=rolls},rolls);
 const button=page.locator('#swing');
 await button.scrollIntoViewIfNeeded();
 const box=await button.boundingBox();
 assert.ok(box&&box.width>=40&&box.height>=40,'Record Swing CTA has a usable touch target');
 const hitTarget=await page.evaluate(({x,y})=>{
  const node=document.elementFromPoint(x,y);
  return !!node&&!!node.closest('#swing');
 },{x:box.x+box.width/2,y:box.y+box.height/2});
 assert.equal(hitTarget,true,'Record Swing is not covered at 375x667');
 await button.click();
 return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
}
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': CPU walkoff, grand slam, visiting runs and third-out feedback at 375x667',async()=>{
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:375,height:667},serviceWorkers:'block'});
   await context.addInitScript(()=>{
    const realRandom=Math.random;
    Math.random=()=>window.__hitLabTestRolls?.length?window.__hitLabTestRolls.shift():.99;
    window.__hitLabOriginalRandom=realRandom;
   });
   const page=await context.newPage();
   const base={innings:3,inning:3,outs:0,home:2,away:2,bases:[true,true,true],zone:5,contact:'MEDIUM',mode:'Exhibition',handoff:false};
   await setup(page,base);
   let state=await recorded(page,[0,.03]);
   assert.equal(state.home,3,'non-homer walkoff credits winning run only');
   assert.equal(state.away,2);
   assert.equal(state.gameFinished,true);
   assert.equal(state.reps,1);
   await page.waitForTimeout(1100);
   assert.match(await page.locator('main').innerText(),/Final Score/i);

   await setup(page,{...base,home:1,contact:'HARD'});
   state=await recorded(page,[0,0]);
   assert.equal(state.home,5,'grand slam retains all four runs');
   assert.equal(state.gameFinished,true);

   await setup(page,{...base,mode:'Family Rivalry',rivalryTurn:'away',handoff:false});
   state=await recorded(page,[0,.03]);
   assert.equal(state.away,5,'visiting triple credits all three runs');
   assert.equal(state.home,2);
   assert.equal(state.gameFinished,false);
   assert.equal(state.rivalryStats.away.reps,1);

   await setup(page,{...base,mode:'Exhibition',inning:1,outs:2,home:0,away:0,bases:[true,false,true],contact:'SOFT'});
   state=await recorded(page,[.99]);
   assert.equal(state.inning,2);
   assert.match(state.feedback,/TOP 2 COMPLETE · OPPONENT \+0/);
   assert.equal(state.log[1],'BALL IN PLAY — OUT');
   await page.waitForTimeout(1100);
   assert.match(await page.locator('#feedback').innerText(),/TOP 2 COMPLETE · OPPONENT \+0/);
   assert.doesNotMatch(await page.locator('#feedback').innerText(),/BALL IN PLAY — OUT/);
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),SENTINEL);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await context.close();
  }finally{await browser.close()}
 });
}

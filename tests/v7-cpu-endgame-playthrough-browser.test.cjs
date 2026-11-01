'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const KEY='hitlab-v7-visual-prototype-only',OTHER='warriors-hit-lab-v7-multiplayer-prototype';
const URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
async function game(page,override){
 await page.addInitScript(()=>{Math.random=()=>0.999999;});
 await page.goto(URL);
 await page.locator('[data-go="Play"]').first().click();
 await page.locator('[data-go="Game"]').first().click();
 await page.evaluate(({key,override})=>{
  const v=JSON.parse(localStorage.getItem(key));
  Object.assign(v,{inning:3,innings:3,outs:2,bases:[false,false,false],gameStarted:true,gameFinished:false,...override});
  localStorage.setItem(key,JSON.stringify(v));
 },{key:KEY,override});
 await page.reload();
 await page.locator('#resumeGame').click();
}
async function saved(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)}
test('CPU final inning trailing home team records third out and final result persists',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await game(page,{home:1,away:4});
  await page.locator('#swing').click();
  const finished=await saved(page);
  assert.equal(finished.gameFinished,true);
  assert.equal(finished.gameStarted,false);
  assert.equal(finished.home,1);
  await page.reload();
  assert.equal((await saved(page)).gameFinished,true);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),OTHER),null);
 }finally{await browser.close();}
});
test('CPU tied final inning advances to extra inning and persists progress on resume',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await game(page,{home:2,away:2});
  await page.locator('#swing').click();
  const extra=await saved(page);
  assert.equal(extra.inning,4);
  assert.equal(extra.extraInnings,1);
  assert.equal(extra.gameFinished,false);
  await page.reload();
  await page.locator('#resumeGame').click();
  const resumed=await saved(page);
  assert.equal(resumed.inning,4);
  assert.equal(resumed.extraInnings,1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),OTHER),null);
 }finally{await browser.close();}
});
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:8765/v7/';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const CPU='hitlab-v7-visual-prototype-only';
async function setup(page,mutate){
 await page.goto(ROOT+'multiplayer.html');
 await page.locator('#start').click();
 await page.evaluate(({key,mutate})=>{
  const v=JSON.parse(localStorage.getItem(key));
  Object.assign(v,mutate);
  localStorage.setItem(key,JSON.stringify(v));
 },{key:KEY,mutate});
 await page.reload();
}
async function swing(page,outcome){
 if(await page.locator('#turn').isVisible())await page.locator('#turn').click();
 await page.locator('#zones button').nth(4).click();
 await page.locator('#outcome').selectOption(outcome);
 await page.locator('#record').click();
}
async function read(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)}
test('Family Rivalry visiting third out in final inning ends game with home lead',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await setup(page,{inning:3,half:'top',outs:2,score:{dad:4,maddon:2}});
  await swing(page,'out');
  const saved=await read(page);
  assert.equal(saved.status,'final');assert.equal(saved.winner,'dad');
  assert.equal(saved.inning,3);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),CPU),null);
 }finally{await browser.close();}
});
test('Family Rivalry home walkoff in final inning survives reload',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await setup(page,{inning:3,half:'bottom',outs:1,score:{dad:2,maddon:2},bases:[false,false,false]});
  await swing(page,'homer');
  const before=await read(page);
  assert.equal(before.status,'final');assert.equal(before.winner,'dad');
  await page.reload();
  const after=await read(page);
  assert.deepEqual(after,before);
 }finally{await browser.close();}
});
test('Family Rivalry tied regulation advances to extra inning with cleared bases and resumes',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await setup(page,{inning:3,half:'bottom',outs:2,score:{dad:2,maddon:2},bases:[true,false,true]});
  await swing(page,'out');
  const extra=await read(page);
  assert.equal(extra.status,'active');assert.equal(extra.inning,4);
  assert.equal(extra.half,'top');assert.equal(extra.outs,0);
  assert.deepEqual(extra.bases,[false,false,false]);
  await page.reload();
  assert.equal((await read(page)).inning,4);
  await swing(page,'single');
  assert.equal((await read(page)).atBats.length,extra.atBats.length+1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),CPU),null);
 }finally{await browser.close();}
});
test('CPU saved final inning resumes with original score outs and no Rivalry overwrite',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(ROOT+'experimental/visual-prototype.html');
  await page.locator('[data-go="Play"]').first().click();
  await page.locator('[data-go="Game"]').first().click();
  await page.evaluate(key=>{
   const state=JSON.parse(localStorage.getItem(key));
   state.inning=state.innings;state.outs=1;state.home=2;state.away=2;state.gameStarted=true;state.gameFinished=false;
   localStorage.setItem(key,JSON.stringify(state));
  },CPU);
  await page.reload();
  await page.locator('#resumeGame').click();
  const actual=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CPU);
  assert.equal(actual.inning,actual.innings);
  assert.equal(actual.outs,1);assert.equal(actual.home,2);assert.equal(actual.away,2);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null);
 }finally{await browser.close();}
});

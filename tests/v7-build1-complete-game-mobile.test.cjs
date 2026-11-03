'use strict';
// Milestone 1 end-to-end phone gameplay: real tee selections, simulated scoring,
// three complete innings, pass-phone, persisted final, and legacy-key isolation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const sentinel='{"career":"preserve-v6.3-sentinel","seasons":[1,2,3]}';
async function read(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);}
async function begin(page){
 await page.goto(URL);
 await page.evaluate(([key,value])=>localStorage.setItem(key,value),[LEGACY,sentinel]);
 await page.locator('#start').tap();
 let m=await read(page);
 assert.equal(m.status,'active');assert.equal(m.inning,1);
 assert.equal(await page.locator('#swingPanel').isVisible(),false);
 return m;
}
async function ready(page,team){
 assert.match(await page.locator('#turn').innerText(),new RegExp('PASS PHONE TO '+team,'i'));
 assert.equal(await page.locator('#swingPanel').isVisible(),false);
 await page.locator('#turn').tap();
 assert.equal(await page.locator('#swingPanel').isVisible(),true);
}
async function swing(page,outcome='out'){
 const before=await read(page);
 await page.locator('#zones button').nth(4).tap(); // Real net zone 5.
 await page.locator('.contact-quality-options button[data-contact=hard]').tap();
 await page.locator('#outcome').selectOption(outcome); // Separate simulated result.
 await page.locator('#record').tap();
 const after=await read(page);
 assert.equal(after.atBats.length,before.atBats.length+1,'one real swing per action');
 assert.equal(after.atBats.at(-1).zone,'MC');
 assert.equal(after.atBats.at(-1).power,'hard');
 assert.equal(after.atBats.at(-1).outcome,outcome);
 assert.equal(after.realSwings[before.half==='top'?'maddon':'dad'],
  before.realSwings[before.half==='top'?'maddon':'dad']+1);
 assert.equal(await page.locator('#record').isDisabled(),true,'no stale repeat');
 return after;
}
async function threeOuts(page){for(let i=0;i<3;i++)await swing(page);}
async function assertFinal(page,winner,score){
 const m=await read(page);
 assert.equal(m.status,'final');assert.equal(m.winner,winner);
 assert.deepEqual(m.score,score);
 assert.equal(await page.locator('#swingPanel').isVisible(),false);
 assert.equal(await page.locator('#turn').isDisabled(),true);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),sentinel);
 assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 const raw=await page.evaluate(k=>localStorage.getItem(k),KEY);
 await page.reload();
 assert.deepEqual(await read(page),m,'final game survives reload');
 assert.equal(await page.locator('#swingPanel').isVisible(),false);
 assert.equal(await page.locator('#turn').isDisabled(),true);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),raw,'reload never rewrites final');
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),sentinel);
}
async function playAwayWin(page){
 await begin(page);
 for(let inning=1;inning<=3;inning++){
  await ready(page,'MADDON');
  if(inning===1)await swing(page,'homer');
  await threeOuts(page);
  let m=await read(page);
  assert.equal(m.half,'bottom');
  assert.equal(m.inning,inning);
  assert.equal(m.outs,0);
  await ready(page,'DAD');
  await threeOuts(page);
  m=await read(page);
  if(inning<3){assert.equal(m.half,'top');assert.equal(m.inning,inning+1);}
 }
 await assertFinal(page,'maddon',{dad:0,maddon:1});
 const m=await read(page);
 assert.equal(m.atBats.length,19);
 assert.equal(m.realSwings.maddon,10);
 assert.equal(m.realSwings.dad,9);
}
async function playHomeWalkoff(page){
 await begin(page);
 for(let inning=1;inning<=3;inning++){
  await ready(page,'MADDON');
  await threeOuts(page);
  await ready(page,'DAD');
  if(inning<3)await threeOuts(page);
 }
 let m=await read(page);
 assert.equal(m.inning,3);assert.equal(m.half,'bottom');
 for(let i=0;i<3;i++)m=await swing(page,'single');
 assert.deepEqual(m.bases,[true,true,true]);
 m=await swing(page,'double');
 assert.equal(m.atBats.at(-1).runs,1,'loaded double awards winning run only');
 await assertFinal(page,'dad',{dad:1,maddon:0});
 assert.equal(m.atBats.length,19);
}
for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': 375/390px full three-inning games, walkoff, pass-phone, final save',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await playAwayWin(page);
    await page.evaluate(()=>localStorage.clear()); // Isolate the second game scenario.
    await playHomeWalkoff(page);
    assert.deepEqual(errors,[],'no browser runtime errors at '+width+'px');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow at '+width+'px');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

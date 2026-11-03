'use strict';
// Build 1 short-phone acceptance: one uninterrupted real-tee-to-final match
// with the same live scorebug, handoffs, save and V6.3 isolation as tall phones.
// This is synthetic test data only; no production or legacy save writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const GAME_URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const LEGACY_RAW='{"career":"short-phone-fullgame-sentinel"}';
const SNAPSHOT_RAW='{"snapshot":"short-phone-fullgame-sentinel"}';
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const raw=page=>page.evaluate(k=>localStorage.getItem(k),KEY);

async function assertFirstScreen(page,selector){
 const geometry=await page.locator(selector).evaluate(el=>{
  const rect=el.getBoundingClientRect(),nav=document.querySelector('.v7-nav').getBoundingClientRect();
  return {top:rect.top,bottom:rect.bottom,height:rect.height,navTop:nav.top,viewport:innerHeight,
   overflow:document.documentElement.scrollWidth-innerWidth,display:getComputedStyle(el).display};
 });
 assert.ok(geometry.top>=0&&geometry.bottom<=Math.min(geometry.navTop,geometry.viewport)-4,
  selector+' must be visible above the sticky nav without scrolling: '+JSON.stringify(geometry));
 assert.ok(geometry.height>=44,selector+' must remain touch-sized');
 assert.ok(geometry.overflow<=0,'no horizontal overflow: '+JSON.stringify(geometry));
}

async function handoff(page,name){
 assert.match(await page.locator('#turn').innerText(),new RegExp('PASS PHONE TO '+name,'i'));
 assert.equal(await page.locator('#swingPanel').isVisible(),false);
 await assertFirstScreen(page,'#turn');
 await page.locator('#turn').tap();
 assert.equal(await page.locator('#swingPanel').isVisible(),true);
 await assertFirstScreen(page,'#record');
}

async function swing(page,outcome='out',zone=4,contact='medium',first=false){
 const before=await read(page),side=before.half==='top'?before.away.id:before.home.id;
 await page.locator('#zones button').nth(zone).tap();
 await page.locator('.contact-quality-options button[data-contact="'+contact+'"]').tap();
 await page.locator('#outcome').selectOption(outcome);
 const button=page.locator('#record');
 assert.equal(await button.isEnabled(),true);
 await button.tap();
 const after=await read(page);
 assert.equal(after.atBats.length,before.atBats.length+1,'one real swing per tap');
 assert.equal(after.realSwings[side],before.realSwings[side]+1,'correct side real swing count');
 assert.equal(after.atBats.at(-1).outcome,outcome);
 assert.equal(after.atBats.at(-1).power,contact);
 assert.equal(await page.locator('#record').isDisabled(),true,'no duplicate swing without a new net zone');
 assert.equal(await page.locator('#recordAfterChoices').count(),0,'legacy duplicate remains absent');
 return after;
}
async function threeOuts(page,first=false){
 for(let i=0;i<3;i++)await swing(page,'out',i,'medium',first&&i===0);
}
for(const [name,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': 375x667 short-phone real tee to three-inning final, handoffs and byte-exact resume',async()=>{
  const browser=await browserType.launch();
  try{
   const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(GAME_URL);
   await page.evaluate(([a,b])=>{localStorage.setItem('warriors-hit-lab-v4',a);localStorage.setItem('warriors-hit-lab-v6-snapshot',b);},[LEGACY_RAW,SNAPSHOT_RAW]);
   await page.locator('#innings').selectOption('3');
   await page.locator('#start').tap();
   await handoff(page,'MADDON');
   await threeOuts(page,true);
   let state=await read(page);
   assert.equal(state.half,'bottom');
   assert.equal(state.inning,1);
   await handoff(page,'DAD');
   await swing(page,'homer',4,'hard');
   assert.equal(await page.locator('#homeScore .score-points').innerText(),'1');
   assert.equal(await page.locator('.score-diamond i.occupied').count(),0);
   await threeOuts(page);
   state=await read(page);
   assert.equal(state.inning,2);
   assert.equal(state.half,'top');
   const saved=await raw(page);
   await page.reload();
   assert.equal(await raw(page),saved,'reload cannot rewrite a valid V7 game');
   await handoff(page,'MADDON');
   await threeOuts(page);
   await handoff(page,'DAD');
   await threeOuts(page);
   await handoff(page,'MADDON');
   await threeOuts(page);
   state=await read(page);
   assert.equal(state.status,'final');
   assert.equal(state.winner,state.home.id);
   assert.deepEqual(state.score,{dad:1,maddon:0});
   assert.equal(state.atBats.length,16);
   assert.equal(state.realSwings.maddon,9);
   assert.equal(state.realSwings.dad,7);
   assert.match(await page.locator('#inning').innerText(),/FINAL/);
   await assertFirstScreen(page,'#turn');
   assert.equal(await page.locator('#turn').isDisabled(),true);
   assert.equal(await page.locator('#swingPanel').isVisible(),false);
   const final=await raw(page);
   await page.reload();
   assert.equal(await raw(page),final,'completed game persists byte-exact');
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),LEGACY_RAW);
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),SNAPSHOT_RAW);
   assert.deepEqual(errors,[],'no browser errors');
   await context.close();
  }finally{await browser.close();}
 });
}

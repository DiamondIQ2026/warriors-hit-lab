'use strict';
// Build 1: real tee zone/contact determines a reproducible entertainment
// simulation by default. No physical hit tracking, schema migration or legacy
// save writes. Manual outcomes remain explicitly labeled QA-only overrides.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const api=require('../v7/pass-and-play.cjs');
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const GAME_URL='http://127.0.0.1:8765/v7/multiplayer.html';
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',hand:'L'});
const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R'});

test('skill-derived simulation is deterministic, pure, and rejects invalid inputs',()=>{
 const match=api.newMatch(home,away,3),raw=JSON.stringify(match);
 const input={zone:'MC',power:'hard'};
 const result=api.resolveSimulatedOutcome(match,input);
 assert.ok(['out','single','double','triple','homer'].includes(result));
 assert.equal(api.resolveSimulatedOutcome(match,input),result);
 assert.equal(JSON.stringify(match),raw,'resolving cannot record a rep or mutate the match');
 assert.throws(()=>api.resolveSimulatedOutcome(match,{zone:'XX',power:'hard'}));
 assert.throws(()=>api.resolveSimulatedOutcome(match,{zone:'MC',power:'impossible'}));
 const final={...match,status:'final'};
 assert.throws(()=>api.resolveSimulatedOutcome(final,input),'no simulation after final');
 const recorded=api.recordSwing(match,{...input,outcome:result});
 assert.equal(recorded.atBats[0].outcome,result);
 assert.equal(recorded.atBats[0].kind,'real-swing');
 assert.equal(recorded.realSwings.maddon,1);
 assert.equal(api.validateMatch(recorded).ok,true);
});

test('zone, contact, batting hand and swing context influence simulated outcomes',()=>{
 const match=api.newMatch(home,away,3);
 let hardHits=0,softHits=0,zoneDifference=false,handDifference=false;
 for(let i=0;i<300;i++){
  const m={...match,atBats:Array.from({length:i},()=>null)};
  const hard=api.resolveSimulatedOutcome(m,{zone:'MC',power:'hard'});
  const soft=api.resolveSimulatedOutcome(m,{zone:'UL',power:'soft'});
  hardHits+=Number(hard!=='out');softHits+=Number(soft!=='out');
  if(hard!==soft)zoneDifference=true;
  const swapped={...m,away:{...m.away,hand:'R'}};
  if(api.resolveSimulatedOutcome(m,{zone:'MR',power:'medium'})!==
     api.resolveSimulatedOutcome(swapped,{zone:'MR',power:'medium'}))handDifference=true;
 }
 assert.ok(hardHits>softHits,'hard center contact should produce more simulated hits in a sample');
 assert.ok(zoneDifference,'zone and contact choices should affect simulation');
 assert.ok(handDifference,'handedness should affect simulation');
});

for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]])
 for(const [width,height] of [[375,667],[390,844]])
 test('Build 1 '+engine+' '+width+'x'+height+': auto simulation, manual QA override, score, flight and reload',async()=>{
  const browser=await browserType.launch();
  try{
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(GAME_URL);
   await page.evaluate(()=>{localStorage.setItem('warriors-hit-lab-v4','{"sentinel":"do-not-change"}')});
   await page.locator('#awayHand').selectOption('L'); // Default setup is right-handed; explicitly exercise left-handed flight.
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   assert.equal(await page.locator('#outcome').inputValue(),'auto','auto simulation must be default');
   await page.locator('#zones button').nth(4).tap();
   await page.locator('.contact-quality-options button[data-contact="hard"]').tap();
   const expected=await page.evaluate(k=>{
    const m=JSON.parse(localStorage.getItem(k));
    return window.HitLabMultiplayer.resolveSimulatedOutcome(m,{zone:'MC',power:'hard'});
   },KEY);
   const geometry=await page.locator('#record').evaluate(el=>{
    const r=el.getBoundingClientRect(),nav=document.querySelector('.v7-nav').getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,navTop:nav.top,height:r.height};
   });
   assert.ok(geometry.top>=0&&geometry.bottom<=geometry.navTop-4,
    'record CTA must remain above nav: '+JSON.stringify(geometry));
   assert.ok(geometry.height>=44);
   await page.locator('#record').tap();
   let saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.equal(saved.atBats.length,1);
   assert.equal(saved.atBats[0].zone,'MC');
   assert.equal(saved.atBats[0].power,'hard');
   assert.equal(saved.atBats[0].outcome,expected);
   assert.equal(saved.realSwings.maddon,1);
   assert.match(await page.locator('#event').innerText(),new RegExp('Simulated game result: '+expected,'i'));
   assert.match(await page.locator('#fieldOutcome').innerText(),new RegExp(expected,'i'));
   const flight=await page.locator('#viewFlight').getAttribute('data-url');
   assert.equal(new URL(flight,GAME_URL).searchParams.get('outcome'),expected);
   assert.equal(new URL(flight,GAME_URL).searchParams.get('hand'),'L');
   const raw=await page.evaluate(k=>localStorage.getItem(k),KEY);
   await page.reload();
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),raw,'reload must preserve exact saved game');
   assert.equal(await page.locator('#outcome').inputValue(),'auto');
   await page.locator('#turn').tap();
   await page.locator('#outcome').selectOption('homer');
   await page.locator('#zones button').nth(0).tap();
   await page.locator('#recordAfterChoices').tap();
   saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.equal(saved.atBats.length,2,'one extra swing');
   assert.equal(saved.atBats[1].outcome,'homer','explicit QA override remains available');
   assert.equal(saved.realSwings.maddon,2);
   assert.equal(saved.score.maddon>=1,true,'simulated home run scores');
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v4')),'{"sentinel":"do-not-change"}');
   assert.deepEqual(errors,[]);
   await context.close();
  }finally{await browser.close();}
 });

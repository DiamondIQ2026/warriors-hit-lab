'use strict';
// Build 1: reject fabricated but superficially consistent match histories.
// This test only uses V7 prototype keys and synthetic legacy sentinels.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const api=require('../v7/pass-and-play.cjs');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const SENTINEL='{"v6.3":"preserve-history-replay-test"}';
const lineup=prefix=>Array.from({length:9},(_,i)=>prefix+' '+(i+1));
const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R',lineup:lineup('Titan')});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',hand:'L',lineup:lineup('Warrior')});
const hit=(m,outcome='out',zone='MC')=>api.recordSwing(m,{zone,power:'hard',outcome});
const clone=x=>JSON.parse(JSON.stringify(x));
function play(...outcomes){
 let m=api.newMatch(home,away,3);
 for(const outcome of outcomes)m=hit(m,outcome);
 return m;
}
test('Build 1 replay accepts real in-progress, handoff, extras, and final histories without mutation',()=>{
 const samples=[play(),play('single'),play('single','out'),play('out','out','out')];
 let extras=play();
 for(let i=0;i<18;i++)extras=hit(extras);
 samples.push(extras);
 let final=extras;
 for(let i=0;i<3;i++)final=hit(final);
 final=hit(final,'homer');
 samples.push(final);
 assert.equal(final.status,'final');
 for(const m of samples){
  const raw=JSON.stringify(m);
  assert.deepEqual(api.validateMatch(m),{ok:true,reason:null});
  assert.equal(JSON.stringify(m),raw,'validator never edits original match');
  assert.deepEqual(api.validateMatch(clone(m)),{ok:true,reason:null});
 }
});
test('Build 1 replay rejects forged batter, chronology, bases, outs and premature final with conserved totals',()=>{
 const m=play('single','out');
 const changes=[
  x=>{x.atBats[0].batter='Impostor';},
  x=>{x.atBats[0].index=4;},
  x=>{x.atBats[0].kind='simulated-only';},
  x=>{x.atBats[0].half='bottom';},
  x=>{x.atBats[0].inning=2;x.inning=2;},
  x=>{x.atBats[1].teamId='dad';x.realSwings.dad=1;x.realSwings.maddon=1;x.battingOrder.dad=1;x.battingOrder.maddon=1;},
  x=>{x.bases=[false,false,false];},
  x=>{x.outs=0;},
  x=>{x.half='bottom';},
  x=>{x.status='final';x.winner='maddon';},
 ];
 for(const change of changes){
  const corrupt=clone(m);change(corrupt);
  const raw=JSON.stringify(corrupt);
  const result=api.validateMatch(corrupt);
  assert.equal(result.ok,false,'rejected forged history: '+raw);
  assert.equal(JSON.stringify(corrupt),raw,'recovery must preserve original bytes');
 }
 assert.equal(api.validateMatch(m).ok,true);
});
test('Build 1 replay rejects a plausible but impossible extra swing after a completed game',()=>{
 let m=play();
 for(let i=0;i<18;i++)m=hit(m);
 for(let i=0;i<3;i++)m=hit(m);
 m=hit(m,'homer');
 assert.equal(m.status,'final');
 const bad=clone(m),last=bad.atBats.at(-1);
 bad.atBats.push({...last,index:(last.index+1)%9,batter:bad.home.lineup[(last.index+1)%9]});
 bad.realSwings.dad++;
 bad.battingOrder.dad=(bad.battingOrder.dad+1)%9;
 bad.score.dad+=last.runs;
 assert.equal(api.validateMatch(bad).ok,false);
 assert.equal(api.validateMatch(m).ok,true);
});
for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': 375/390px forged at-bat quarantined without touching legacy saves',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL);
    await page.evaluate(([key,value])=>localStorage.setItem(key,value),[LEGACY,SENTINEL]);
    await page.locator('#start').tap();
    await page.locator('#turn').tap();
    await page.locator('#zones button').nth(4).tap();
    await page.locator('#outcome').selectOption('single');
    await page.locator('#recordAfterChoices').tap();
    const original=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(original.atBats.length,1);
    assert.equal(original.bases[0],true);
    const damaged=clone(original);
    damaged.atBats[0].batter='Wrong batter but matching score';
    const raw=JSON.stringify(damaged);
    await page.evaluate(([key,value])=>localStorage.setItem(key,value),[KEY,raw]);
    await page.reload();
    assert.equal(await page.locator('#saveRecovery').isVisible(),true);
    assert.equal(await page.locator('#start').isDisabled(),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),raw);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),SENTINEL);
    assert.equal(await page.locator('#saveRecoveryExport').isVisible(),true);
    assert.deepEqual(errors,[],'no browser errors at '+width+'px');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

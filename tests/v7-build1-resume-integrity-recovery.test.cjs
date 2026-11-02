'use strict';
// Build 1: saved-match integrity and non-destructive browser recovery.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createProfile,newMatch,recordSwing,validateMatch}=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const OTHER='warriors-hit-lab-v4';
const SENTINEL='{"v6.3":"untouched","season":[1,2,3]}';
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const profile=(id,team)=>createProfile({id,name:id,team,lineup:Array.from({length:9},(_,i)=>id+' '+(i+1))});
const dad=profile('dad','Tampa Titans'),maddon=profile('maddon','Tampa Warriors');
const clone=x=>JSON.parse(JSON.stringify(x));
const swing=(m,outcome='out')=>recordSwing(m,{zone:'MC',power:'hard',outcome});

test('Build 1 integrity: fresh, in-progress, extra-inning and final saves remain resumable',()=>{
 let m=newMatch(dad,maddon,3);
 assert.deepEqual(validateMatch(m),{ok:true,reason:null});
 m=swing(m,'single');assert.equal(validateMatch(clone(m)).ok,true);
 for(let i=0;i<3;i++)m=swing(m);
 assert.equal(validateMatch(m).ok,true);
 let finished=swing(newMatch(dad,maddon,3),'homer'); // Visitor leads; home bats in all three innings.
 for(let inning=1;inning<=3;inning++){
  for(let i=0;i<3;i++)finished=swing(finished);
  for(let i=0;i<3;i++)finished=swing(finished);
 }
 assert.equal(finished.status,'final');
 assert.equal(finished.winner,'maddon');
 assert.equal(validateMatch(clone(finished)).ok,true);
});

test('Build 1 integrity: reject corrupted score, swing counts, bases, lineup, outs, and winner',()=>{
 const m=swing(newMatch(dad,maddon,3),'single');
 const cases=[
  x=>{x.score.maddon=100;},
  x=>{x.realSwings.maddon=3;},
  x=>{x.battingOrder.maddon=8;},
  x=>{x.bases=[true,'occupied',false];},
  x=>{x.outs=3;},
  x=>{x.home.lineup.pop();},
  x=>{x.atBats[0].zone='NOT_A_ZONE';},
  x=>{x.atBats[0].runs=-1;},
  x=>{x.atBats[0].teamId='outsider';},
  x=>{x.status='final';x.winner=null;},
  x=>{x.inning=0;},
  x=>{x.version=999;},
  x=>{x.atBats.push({...x.atBats[0]});}
 ];
 for(const mutate of cases){
  const damaged=clone(m),original=JSON.stringify(damaged);
  mutate(damaged);
  const raw=JSON.stringify(damaged);
  const result=validateMatch(damaged);
  assert.equal(result.ok,false,'invalid fixture rejected: '+raw);
  assert.equal(typeof result.reason,'string');
  assert.equal(JSON.stringify(damaged),raw,'validator never edits the save');
 }
 assert.equal(validateMatch(m).ok,true,'original match remains valid');
 assert.equal(validateMatch(null).ok,false);
});

for(const [name,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': 375/390px corrupt-save export, cancellation, explicit discard and safe restart',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,acceptDownloads:true});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL);
    await page.evaluate(([key,other,sentinel])=>{
     localStorage.setItem(key,'{"bad":"unreadable"}');
     localStorage.setItem(other,sentinel);
    },[KEY,OTHER,SENTINEL]);
    await page.reload();
    assert.equal(await page.locator('#saveRecovery').isVisible(),true);
    assert.equal(await page.locator('#start').isDisabled(),true);
    assert.match(await page.locator('#saveRecovery').innerText(),/original saved bytes are preserved/i);
    const downloadPromise=page.waitForEvent('download');
    await page.locator('#saveRecoveryExport').tap();
    const download=await downloadPromise;
    assert.equal(download.suggestedFilename(),'hit-lab-v7-recovery-original.json');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),'{"bad":"unreadable"}');
    page.once('dialog',d=>d.dismiss());
    await page.locator('#saveRecoveryDiscard').tap();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),'{"bad":"unreadable"}','cancel preserves original');
    page.once('dialog',d=>d.accept());
    await page.locator('#saveRecoveryDiscard').tap();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),OTHER),SENTINEL);
    assert.equal(await page.locator('#start').isEnabled(),true);
    await page.locator('#start').tap();
    let saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(saved.status,'active');
    saved.score.maddon=50;
    const damaged=JSON.stringify(saved);
    await page.evaluate(([key,value])=>localStorage.setItem(key,value),[KEY,damaged]);
    await page.reload();
    assert.equal(await page.locator('#saveRecovery').isVisible(),true,'mismatched score quarantined');
    assert.equal(await page.locator('#start').isDisabled(),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),damaged);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),OTHER),SENTINEL);
    assert.deepEqual(errors,[],'no runtime errors at '+width+'px');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

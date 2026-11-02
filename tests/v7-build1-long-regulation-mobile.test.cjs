'use strict';
// Build 1: 6-inning full-game mobile acceptance and 9-inning engine regression.
// Synthetic V6.3 sentinels only. This file never imports or writes live player saves.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const api=require('../v7/pass-and-play.cjs');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const LEGACY_RAW='{"career":"six-inning-regression-sentinel"}';
const SNAPSHOT_RAW='{"snapshot":"six-inning-regression-sentinel"}';
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);

async function record(page,outcome='out'){
 const before=await read(page);
 await page.locator('#zones button').nth(4).tap();
 await page.locator('.contact-quality-options button[data-contact=hard]').tap();
 await page.locator('#outcome').selectOption(outcome);
 await page.locator('#recordAfterChoices').tap();
 const after=await read(page);
 const id=before.half==='top'?before.away.id:before.home.id;
 assert.equal(after.atBats.length,before.atBats.length+1,'one real tee swing per simulated at-bat');
 assert.equal(after.realSwings[id],before.realSwings[id]+1,'independent real-swing count');
 assert.equal(after.atBats.at(-1).zone,'MC');
 assert.equal(after.atBats.at(-1).power,'hard');
 assert.equal(after.atBats.at(-1).outcome,outcome);
 assert.equal(await page.locator('#recordAfterChoices').isDisabled(),true,'cannot record twice');
 return after;
}
async function handoff(page,name){
 assert.match(await page.locator('#turn').innerText(),new RegExp('PASS PHONE TO '+name,'i'));
 assert.equal(await page.locator('#swingPanel').isVisible(),false,'handoff requires acknowledgment');
 await page.locator('#turn').tap();
 assert.equal(await page.locator('#swingPanel').isVisible(),true);
}
async function threeOuts(page){for(let i=0;i<3;i++)await record(page);}

for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': six-inning complete mobile game at 375/390, resume and save isolation',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(URL);
    await page.evaluate(([legacy,snapshot])=>{
     localStorage.setItem('warriors-hit-lab-v4',legacy);
     localStorage.setItem('warriors-hit-lab-v6-snapshot',snapshot);
    },[LEGACY_RAW,SNAPSHOT_RAW]);
    await page.locator('#innings').selectOption('6');
    await page.locator('#start').tap();
    for(let inning=1;inning<=6;inning++){
     await handoff(page,'MADDON');
     if(inning===1)await record(page,'homer');
     await threeOuts(page);
     let match=await read(page);
     assert.equal(match.inning,inning);
     assert.equal(match.half,'bottom');
     assert.equal(match.status,'active');
     await handoff(page,'DAD');
     await threeOuts(page);
     match=await read(page);
     assert.deepEqual(match.score,{dad:0,maddon:1});
     assert.equal(match.atBats.length,6*inning+1);
     if(inning<6){
      assert.equal(match.inning,inning+1);
      assert.equal(match.half,'top');
      assert.equal(match.status,'active');
      if(inning===3){
       const saved=await page.evaluate(key=>localStorage.getItem(key),KEY);
       await page.reload();
       assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),saved,'reload is read-only');
       assert.equal(await page.locator('#swingPanel').isVisible(),false,'resume still needs handoff');
      }
     }else{
      assert.equal(match.status,'final');
      assert.equal(match.winner,'maddon');
     }
    }
    const finished=await read(page);
    assert.equal(finished.atBats.length,37);
    assert.equal(finished.realSwings.maddon,19);
    assert.equal(finished.realSwings.dad,18);
    assert.match(await page.locator('#inning').innerText(),/FINAL/);
    assert.equal(await page.locator('#turn').isDisabled(),true);
    assert.equal(await page.locator('#swingPanel').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY),LEGACY_RAW);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),SNAPSHOT),SNAPSHOT_RAW);
    const raw=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await page.reload();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw,'final state persists exactly');
    assert.equal(await page.locator('#turn').isDisabled(),true);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY),LEGACY_RAW);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),SNAPSHOT),SNAPSHOT_RAW);
    assert.deepEqual(errors,[],'no browser exceptions');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

test('Build 1: nine-inning deterministic full game remains valid after JSON restore',()=>{
 const lineup=prefix=>Array.from({length:9},(_,i)=>prefix+' '+(i+1));
 const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',lineup:lineup('Titan')});
 const away=api.createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',lineup:lineup('Warrior')});
 const swing=(m,outcome='out')=>api.recordSwing(m,{zone:'MC',power:'hard',outcome});
 let match=api.newMatch(home,away,9);
 const original=JSON.stringify(match);
 match=swing(match,'homer');
 for(let inning=1;inning<=9;inning++){
  for(let i=0;i<6;i++)match=swing(match);
  assert.deepEqual(match.score,{dad:0,maddon:1});
  if(inning<9){
   assert.equal(match.inning,inning+1);
   assert.equal(match.half,'top');
   assert.equal(match.status,'active');
  }
  assert.equal(api.validateMatch(match).ok,true,'valid after inning '+inning);
  match=JSON.parse(JSON.stringify(match));
 }
 assert.equal(match.status,'final');
 assert.equal(match.winner,'maddon');
 assert.equal(match.atBats.length,55);
 assert.equal(match.realSwings.maddon,28);
 assert.equal(match.realSwings.dad,27);
 assert.equal(api.validateMatch(match).ok,true);
 assert.equal(JSON.stringify(api.newMatch(home,away,9)),original,'initial match unchanged');
 assert.throws(()=>swing(match),/complete/,'no postgame swing accepted');
});

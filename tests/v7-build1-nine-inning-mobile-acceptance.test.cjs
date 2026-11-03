'use strict';
// Build 1: real phone-sized nine-inning acceptance, varied net zones/contact,
// deterministic simulated results, full handoffs, resume, and save isolation.
// Only synthetic V6.3 sentinels are used. No production or legacy writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const LEGACY_RAW='{"career":"nine-inning-mobile-sentinel"}';
const SNAPSHOT_RAW='{"snapshot":"nine-inning-mobile-sentinel"}';
const ZONES=['UL','UC','UR','ML','MC','MR','LL','LC','LR'];
const CONTACT=['soft','medium','hard'];
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);

async function acknowledge(page,name){
 assert.match(await page.locator('#turn').innerText(),new RegExp('PASS PHONE TO '+name,'i'));
 assert.equal(await page.locator('#swingPanel').isVisible(),false,'pass-phone gate before next half');
 await page.locator('#turn').tap();
 assert.equal(await page.locator('#swingPanel').isVisible(),true);
}
async function record(page,outcome='out'){
 const before=await read(page),n=before.atBats.length;
 const zoneIndex=n%9,contact=CONTACT[n%3];
 await page.locator('#zones button').nth(zoneIndex).tap();
 await page.locator('.contact-quality-options button[data-contact='+contact+']').tap();
 await page.locator('#outcome').selectOption(outcome);
 await page.locator('#record').tap();
 const after=await read(page),last=after.atBats.at(-1);
 const id=before.half==='top'?before.away.id:before.home.id;
 assert.equal(after.atBats.length,n+1,'exactly one real swing');
 assert.equal(after.realSwings[id],before.realSwings[id]+1,'real-swing counter');
 assert.equal(last.zone,ZONES[zoneIndex],'correct 3x3 net-impact zone');
 assert.equal(last.power,contact,'contact quality stored independently');
 assert.equal(last.outcome,outcome,'simulated result recorded separately');
 assert.equal(last.teamId,id,'correct batting side');
 assert.equal(last.inning,before.inning,'swing credited to correct inning');
 assert.equal(last.half,before.half,'swing credited to correct half');
 assert.equal(await page.locator('#record').isDisabled(),true,'no duplicate swing');
 assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),outcome,'latest visual result');
 return after;
}
for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': 375/390px full nine-inning game, all nine zones, handoffs and restore',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL);
    await page.evaluate(([legacy,snapshot])=>{
     localStorage.setItem('warriors-hit-lab-v4',legacy);
     localStorage.setItem('warriors-hit-lab-v6-snapshot',snapshot);
    },[LEGACY_RAW,SNAPSHOT_RAW]);
    await page.locator('#innings').selectOption('9');
    await page.locator('#start').tap();
    for(let inning=1;inning<=9;inning++){
     await acknowledge(page,'MADDON');
     if(inning===1)await record(page,'homer');
     for(let out=0;out<3;out++)await record(page);
     let m=await read(page);
     assert.equal(m.inning,inning);
     assert.equal(m.half,'bottom');
     assert.equal(m.outs,0);
     assert.deepEqual(m.bases,[false,false,false]);
     assert.deepEqual(m.score,{dad:0,maddon:1});
     await acknowledge(page,'DAD');
     for(let out=0;out<3;out++)await record(page);
     m=await read(page);
     assert.deepEqual(m.score,{dad:0,maddon:1});
     assert.equal(m.atBats.length,6*inning+1);
     assert.deepEqual(m.bases,[false,false,false]);
     if(inning<9){
      assert.equal(m.inning,inning+1);
      assert.equal(m.half,'top');
      assert.equal(m.outs,0);
      assert.equal(m.status,'active');
      if(inning===5){
       const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
       await page.reload();
       assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved,'resume does not rewrite V7 bytes');
       assert.equal(await page.locator('#swingPanel').isVisible(),false,'resume requires handoff');
      }
     }else{
      assert.equal(m.status,'final');
      assert.equal(m.winner,'maddon');
     }
    }
    const final=await read(page);
    assert.equal(final.atBats.length,55);
    assert.equal(final.realSwings.maddon,28);
    assert.equal(final.realSwings.dad,27);
    assert.deepEqual(new Set(final.atBats.map(a=>a.zone)),new Set(ZONES),'all nine zones exercised');
    assert.deepEqual(new Set(final.atBats.map(a=>a.power)),new Set(CONTACT),'all three contact qualities exercised');
    assert.match(await page.locator('#inning').innerText(),/FINAL/);
    assert.equal(await page.locator('#turn').isDisabled(),true,'no postgame handoff');
    assert.equal(await page.locator('#swingPanel').isVisible(),false,'no postgame swing');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),LEGACY_RAW);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),SNAPSHOT_RAW);
    const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
    await page.reload();
    assert.deepEqual(await read(page),final,'final game survives reload');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved,'final save bytes unchanged');
    assert.equal(await page.locator('#turn').isDisabled(),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),LEGACY_RAW);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),SNAPSHOT_RAW);
    assert.deepEqual(errors,[],'no browser exceptions at '+width+'px');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

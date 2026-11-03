'use strict';
// Build 1 integration: full tied regulation, extra innings, save/resume and grand-slam walkoff.
// Browser tests use synthetic legacy sentinels only; no real player saves or migrations.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const legacyValue='{"career":"untouched-v6.3","season":{"played":12}}';
const snapshotValue='{"backup":"untouched-v6.3"}';
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function handoff(page,name){
 assert.match(await page.locator('#turn').innerText(),new RegExp('PASS PHONE TO '+name,'i'));
 assert.equal(await page.locator('#swingPanel').isVisible(),false,'next player must acknowledge');
 await page.locator('#turn').tap();
 assert.equal(await page.locator('#swingPanel').isVisible(),true);
}
async function record(page,outcome='out'){
 const before=await read(page);
 await page.locator('#zones button').nth(4).tap();
 await page.locator('.contact-quality-options button[data-contact=hard]').tap();
 await page.locator('#outcome').selectOption(outcome);
 await page.locator('#record').tap();
 const after=await read(page);
 const id=before.half==='top'?before.away.id:before.home.id;
 assert.equal(after.atBats.length,before.atBats.length+1,'exactly one at-bat');
 assert.equal(after.realSwings[id],before.realSwings[id]+1,'real swing counted independently');
 assert.equal(after.atBats.at(-1).zone,'MC');
 assert.equal(after.atBats.at(-1).power,'hard');
 assert.equal(after.atBats.at(-1).outcome,outcome);
 assert.equal(await page.locator('#record').isDisabled(),true,'cannot double-submit');
 return after;
}
async function outs(page){for(let i=0;i<3;i++)await record(page);}
async function reloadGate(page){
 const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
 await page.reload();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before,'reload is read-only');
 assert.equal(await page.locator('#swingPanel').isVisible(),false,'restore must require handoff');
}
for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': 375/390px tie through three innings, saved extra-inning grand slam walkoff',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL);
    await page.evaluate(([a,b])=>{
      localStorage.setItem('warriors-hit-lab-v4',a);
      localStorage.setItem('warriors-hit-lab-v6-snapshot',b);
    },[legacyValue,snapshotValue]);
    await page.locator('#start').tap();
    for(let inning=1;inning<=3;inning++){
      await handoff(page,'MADDON');
      await outs(page);
      let m=await read(page);
      assert.equal(m.half,'bottom');assert.equal(m.inning,inning);
      await handoff(page,'DAD');
      await outs(page);
      m=await read(page);
      assert.equal(m.inning,inning+1);
      assert.equal(m.half,'top');assert.equal(m.status,'active');
      assert.deepEqual(m.score,{dad:0,maddon:0});
    }
    let m=await read(page);
    assert.equal(m.inning,4,'tie after regulation advances to extras');
    assert.equal(m.atBats.length,18);
    await reloadGate(page);
    await handoff(page,'MADDON');
    m=await record(page,'homer');
    assert.deepEqual(m.score,{dad:0,maddon:1});
    assert.equal(await page.locator('#awayScore .score-team').innerText(),'Tampa Warriors');
    assert.equal(await page.locator('#awayScore .score-points').innerText(),'1');
    await outs(page);
    m=await read(page);
    assert.equal(m.half,'bottom');assert.equal(m.inning,4);
    await reloadGate(page);
    await handoff(page,'DAD');
    for(let i=0;i<3;i++)m=await record(page,'single');
    assert.deepEqual(m.bases,[true,true,true],'bases loaded for home side');
    assert.match(await page.locator('.score-diamond').getAttribute('aria-label'),/1, 2, 3/);
    m=await record(page,'homer');
    assert.equal(m.status,'final');
    assert.equal(m.winner,'dad');
    assert.deepEqual(m.score,{dad:4,maddon:1},'walkoff grand slam credits all four runs');
    assert.equal(m.atBats.at(-1).runs,4);
    assert.equal(m.atBats.length,26);
    assert.equal(m.realSwings.dad,13);assert.equal(m.realSwings.maddon,13);
    assert.equal(await page.locator('#homeScore .score-team').innerText(),'Tampa Titans');
    assert.equal(await page.locator('#homeScore .score-points').innerText(),'4');
    assert.match(await page.locator('#inning').textContent(),/FINAL/);
    assert.equal(await page.locator('#swingPanel').isVisible(),false);
    assert.equal(await page.locator('#turn').isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),legacyValue);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),snapshotValue);
    assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
    const finalRaw=await page.evaluate(k=>localStorage.getItem(k),KEY);
    await page.reload();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),finalRaw,'final saved game unchanged on reload');
    assert.equal(await page.locator('#turn').isDisabled(),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),legacyValue);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),snapshotValue);
    assert.deepEqual(errors,[],'no browser exceptions');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

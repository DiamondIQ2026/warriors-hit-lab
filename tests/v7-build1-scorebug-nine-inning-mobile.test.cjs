'use strict';
// Build 1 integration: scoreboard from the independent #117/#121 branch plus
// a real nine-inning pass-phone mobile browser game. Synthetic legacy keys only.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const LEGACY_RAW='{"career":"scorebug-nine-inning-sentinel"}';
const SNAPSHOT_RAW='{"snapshot":"scorebug-nine-inning-sentinel"}';
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function record(page,outcome='out',zone=4,contact='hard'){
 const before=await read(page);
 await page.locator('#zones button').nth(zone).tap();
 await page.locator('.contact-quality-options button[data-contact="'+contact+'"]').tap();
 await page.locator('#outcome').selectOption(outcome);
 assert.equal(await page.locator('#record').isEnabled(),true);
 await page.locator('#record').tap();
 const after=await read(page);
 const side=before.half==='top'?before.away.id:before.home.id;
 assert.equal(after.atBats.length,before.atBats.length+1,'exactly one tee swing');
 assert.equal(after.realSwings[side],before.realSwings[side]+1);
 assert.equal(after.atBats.at(-1).outcome,outcome);
 assert.equal(after.atBats.at(-1).power,contact);
 assert.equal(await page.locator('#record').isDisabled(),true);
 return after;
}
async function handoff(page,name){
 assert.match(await page.locator('#turn').innerText(),new RegExp('PASS PHONE TO '+name,'i'));
 assert.equal(await page.locator('#swingPanel').isVisible(),false);
 await page.locator('#turn').tap();
 assert.equal(await page.locator('#swingPanel').isVisible(),true);
}
async function assertScorebug(page,away,home){
 assert.equal(await page.locator('#awayScore .score-team').innerText(),'Tampa Warriors');
 assert.equal(await page.locator('#homeScore .score-team').innerText(),'Tampa Titans');
 assert.equal(await page.locator('#awayScore .score-points').innerText(),String(away));
 assert.equal(await page.locator('#homeScore .score-points').innerText(),String(home));
 for(const id of ['awayScore','homeScore']){
  const geometry=await page.locator('#'+id).evaluate(el=>({
   direction:getComputedStyle(el).flexDirection,
   fontSize:parseFloat(getComputedStyle(el.querySelector('.score-points')).fontSize)
  }));
  assert.equal(geometry.direction,'column','team and score stack symmetrically');
  assert.ok(geometry.fontSize>=20,'score remains readable on mobile');
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
}
async function legacySentinels(page){
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),LEGACY_RAW);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),SNAPSHOT_RAW);
}
for(const [engine,type] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': symmetric live scorebug, runner diamond and reload at 375/390',async()=>{
  const browser=await type.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(BASE);
    await page.evaluate(([a,b])=>{localStorage.setItem('warriors-hit-lab-v4',a);localStorage.setItem('warriors-hit-lab-v6-snapshot',b);},[LEGACY_RAW,SNAPSHOT_RAW]);
    await page.locator('#start').tap();
    await assertScorebug(page,0,0);
    const turnBox=await page.locator('#turn').boundingBox();
    assert.ok(turnBox&&turnBox.y<480,'pass-phone CTA remains high on the first screen');
    await handoff(page,'MADDON');
    await record(page,'single',4,'medium');
    assert.equal(await page.locator('.score-diamond [data-base="1"].occupied').count(),1);
    assert.equal(await page.locator('.score-diamond [data-base="2"].occupied').count(),0);
    assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'single');
    await record(page,'homer',4,'hard');
    await assertScorebug(page,2,0);
    assert.equal(await page.locator('.score-diamond i.occupied').count(),0);
    assert.equal(await page.locator('.simulated-field').getAttribute('data-outcome'),'homer');
    const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
    await page.reload();
    await assertScorebug(page,2,0);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved);
    await legacySentinels(page);
    assert.deepEqual(errors,[]);
    await context.close();
   }
  }finally{await browser.close();}
 });

 test('Build 1 '+engine+': full nine-inning pass-phone mobile game at 375/390 with resume',async()=>{
  const browser=await type.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(BASE);
    await page.evaluate(([a,b])=>{localStorage.setItem('warriors-hit-lab-v4',a);localStorage.setItem('warriors-hit-lab-v6-snapshot',b);},[LEGACY_RAW,SNAPSHOT_RAW]);
    await page.locator('#innings').selectOption('9');
    await page.locator('#start').tap();
    for(let inning=1;inning<=9;inning++){
     await handoff(page,'MADDON');
     if(inning===1)await record(page,'homer',4,'hard');
     for(let out=0;out<3;out++)await record(page,'out',out%9,out%2?'medium':'hard');
     let match=await read(page);
     assert.equal(match.inning,inning);
     assert.equal(match.half,'bottom');
     assert.equal(match.outs,0);
     await handoff(page,'DAD');
     for(let out=0;out<3;out++)await record(page,'out',(out+3)%9,'soft');
     match=await read(page);
     assert.deepEqual(match.score,{dad:0,maddon:1});
     assert.equal(match.atBats.length,6*inning+1);
     await assertScorebug(page,1,0);
     if(inning<9){
      assert.equal(match.status,'active');
      assert.equal(match.half,'top');
      assert.equal(match.inning,inning+1);
      if(inning===5){
       const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
       await page.reload();
       assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved,'resume does not rewrite saved bytes');
       assert.equal(await page.locator('#swingPanel').isVisible(),false,'new half requires handoff');
       await assertScorebug(page,1,0);
      }
     }else{
      assert.equal(match.status,'final');
      assert.equal(match.winner,'maddon');
     }
    }
    const final=await read(page);
    assert.equal(final.atBats.length,55);
    assert.equal(final.realSwings.maddon,28);
    assert.equal(final.realSwings.dad,27);
    assert.match(await page.locator('#inning').innerText(),/FINAL/);
    assert.equal(await page.locator('#turn').isDisabled(),true);
    assert.equal(await page.locator('#swingPanel').isVisible(),false);
    assert.equal(await page.locator('.score-diamond i.occupied').count(),0);
    const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
    await page.reload();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved,'final remains byte-identical after reload');
    await assertScorebug(page,1,0);
    assert.equal(await page.locator('#turn').isDisabled(),true);
    await legacySentinels(page);
    assert.deepEqual(errors,[],'no browser exceptions');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

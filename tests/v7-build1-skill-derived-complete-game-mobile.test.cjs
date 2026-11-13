'use strict';
// Genuine skill-derived V7 full-game acceptance. No #outcome overrides or forced results.
// Draft builder-only coverage; do not run against hosted production or V6.3.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=require('../v7/pass-and-play.cjs');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const ZONES=9;
for(const [browserName,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 for(const [width,height] of [[375,667],[390,844]]){
  test(`${browserName} ${width}x${height}: skill-derived nine-zone Family Rivalry through final and reload`,{timeout:180000},async()=>{
   const browser=await browserType.launch();
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto(URL);
    await page.evaluate(()=>localStorage.setItem('v6.3-preserve-test','unchanged'));
    await page.locator('#innings').selectOption('3');
    await page.locator('#difficulty').selectOption('rookie');
    await page.locator('#start').click();
    let handoffs=0,priorHalf=null,midgameReloaded=false,seenZones=new Set();
    for(let swing=0;swing<500;swing++){
     const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
     assert.equal(engine.validateMatch(before).ok,true,'saved match remains replay-valid');
     if(before.status==='final')break;
     const half=before.half;
     if(priorHalf!==null&&half!==priorHalf)handoffs++;
     priorHalf=half;
     const zoneIndex=swing%ZONES;
     seenZones.add(zoneIndex);
     // This selects only real nine-zone tee/contact inputs; simulated outcome remains auto.
     await page.evaluate(index=>{
      const turn=document.getElementById('turn');
      if(!turn.disabled)turn.click();
      document.querySelectorAll('#zones button')[index].click();
      document.getElementById('record').click();
     },zoneIndex);
     const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
     assert.equal(after.atBats.length,before.atBats.length+1,'one persisted rep per swing');
     assert.equal(after.realSwings[after.away.id]+after.realSwings[after.home.id],after.atBats.length);
     assert.equal(engine.validateMatch(after).ok,true);
     if(!midgameReloaded&&swing>=12){
      const bytes=await page.evaluate(key=>localStorage.getItem(key),KEY);
      await page.reload();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),bytes,'midgame reload is byte-exact');
      midgameReloaded=true;
     }
    }
    const final=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(final.status,'final','skill-derived game must complete without forced outcomes');
    assert.equal(final.innings,3);
    assert.equal(final.difficulty,'rookie');
    assert.equal(engine.validateMatch(final).ok,true);
    assert.ok(handoffs>=5,'three innings require alternating Family Rivalry turns');
    assert.equal(seenZones.size,9,'all nine tee zones exercised');
    assert.ok(final.winner===final.home.id||final.winner===final.away.id);
    assert.match(await page.locator('#recapScore').innerText(),/FINAL/);
    const bytes=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await page.reload();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),bytes,'final save reload byte-exact');
    assert.equal(await page.evaluate(()=>localStorage.getItem('v6.3-preserve-test')),'unchanged');
    assert.deepEqual(errors,[]);
   }finally{await context.close();await browser.close();}
  });
 }
}

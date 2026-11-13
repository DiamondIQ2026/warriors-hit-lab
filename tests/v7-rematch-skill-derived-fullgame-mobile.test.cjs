'use strict';
// Complete skill-derived Family Rivalry -> final -> rematch -> reload acceptance.
// No outcome override; no legacy career writes. Browser coverage: 375x667 / 390x844.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=require('../v7/pass-and-play.cjs');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [browserName,browserType] of [['Chromium',chromium],['WebKit',webkit]])
 for(const [width,height] of [[375,667],[390,844]])
  test(`${browserName} ${width}x${height}: genuine skill game, final, safe rematch and reload`,{timeout:360000},async()=>{
   const browser=await browserType.launch();
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto(URL);
    await page.evaluate(()=>localStorage.setItem('v6.3-preserve-test','original'));
    await page.locator('#innings').selectOption('3');
    await page.locator('#difficulty').selectOption('legend');
    await page.locator('#start').click();
    let final=null,seen=new Set(),handoffs=0,priorHalf=null;
    for(let i=0;i<600;i++){
     const state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(engine.validateMatch(state).ok,true);
     if(state.status==='final'){final=state;break;}
     if(priorHalf!==null&&priorHalf!==state.half)handoffs++;
     priorHalf=state.half;
     const z=i%9;seen.add(z);
     const turn=page.locator('#turn');
     if(await turn.isEnabled())await turn.tap();
     await page.locator('#zones button').nth(z).tap();
     const record=page.locator('#record');
     await record.scrollIntoViewIfNeeded();
     await record.tap();
    }
    assert.ok(final,'skill-derived game reaches final');
    assert.equal(seen.size,9);
    assert.ok(handoffs>=4);
    assert.equal(final.difficulty,'legend');
    assert.match(await page.locator('#recapScore').innerText(),/FINAL/);
    assert.equal(await page.locator('#rematch').isVisible(),true);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#rematch').click();
    const fresh=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(fresh.status,'active');
    assert.equal(fresh.atBats.length,0);
    assert.equal(fresh.inning,1);
    assert.equal(fresh.half,'top');
    assert.deepEqual(fresh.bases,[false,false,false]);
    assert.equal(fresh.difficulty,'legend');
    assert.equal(fresh.innings,final.innings);
    assert.deepEqual(fresh.home,final.home);
    assert.deepEqual(fresh.away,final.away);
    assert.equal(engine.validateMatch(fresh).ok,true);
    assert.equal(await page.locator('#rematch').isVisible(),false);
    const saved=await page.evaluate(k=>localStorage.getItem(k),KEY);
    await page.reload();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),saved);
    assert.equal(await page.evaluate(()=>localStorage.getItem('v6.3-preserve-test')),'original');
    const rematchTurn=page.locator('#turn');
    if(await rematchTurn.isEnabled())await rematchTurn.tap();
    await page.locator('#zones button').first().tap();
    await page.locator('#record').scrollIntoViewIfNeeded();
    await page.locator('#record').tap();
    const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(after.atBats.length,1);
    assert.equal(engine.validateMatch(after).ok,true);
    assert.deepEqual(errors,[]);
   }finally{await context.close();await browser.close();}
  });

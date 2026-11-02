'use strict';
// Milestone 1: verify the REAL game-to-stadium handoff, not two unrelated previews.
// Synthetic sentinels only; no legacy writes, migrations, or production changes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const GAME_URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const LEGACY_RAW='{"career":"game-to-flight-sentinel"}';
const SNAPSHOT_RAW='{"snapshot":"game-to-flight-sentinel"}';
const read=page=>page.evaluate(k=>localStorage.getItem(k),KEY);
for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+engine+': recorded game swing opens matching stadium flight, closes safely and resumes at 375/390',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(GAME_URL);
    await page.evaluate(([legacy,snapshot])=>{
     localStorage.setItem('warriors-hit-lab-v4',legacy);
     localStorage.setItem('warriors-hit-lab-v6-snapshot',snapshot);
    },[LEGACY_RAW,SNAPSHOT_RAW]);
    await page.locator('#innings').selectOption('3');
    await page.locator('#start').tap();
    assert.match(await page.locator('#turn').innerText(),/PASS PHONE TO MADDON/i);
    await page.locator('#turn').tap();
    assert.equal(await page.locator('#viewFlight').isVisible(),false,'no flight before real swing');
    await page.locator('#zones button').nth(4).tap(); // MC
    await page.locator('.contact-quality-options button[data-contact=hard]').tap();
    await page.locator('#outcome').selectOption('single');
    await page.locator('#recordAfterChoices').tap();
    const saved=await read(page),match=JSON.parse(saved);
    assert.equal(match.atBats.length,1,'one recorded game swing');
    assert.equal(match.atBats[0].zone,'MC');
    assert.equal(match.atBats[0].power,'hard');
    assert.equal(match.atBats[0].outcome,'single');
    assert.equal(await page.locator('#viewFlight').isVisible(),true);
    const query=await page.locator('#viewFlight').getAttribute('data-url');
    assert.ok(query&&query.includes('preview.html?'),'game passes parameters to stadium');
    const params=new URL(query,'http://127.0.0.1:8765').searchParams;
    assert.equal(params.get('zone'),'MC');
    assert.equal(params.get('contact'),'hard');
    assert.equal(params.get('outcome'),'single');
    assert.equal(params.get('hand'),match.away.hand,'flight uses current batter hand');
    await page.locator('#viewFlight').tap();
    assert.equal(await page.locator('#flightDialog').evaluate(e=>e.open),true);
    const flight=page.frameLocator('#flightFrame');
    assert.match(await flight.locator('#field').textContent(),/TROPICANA FIELD/);
    assert.equal(await flight.locator('#zone').inputValue(),'MC');
    assert.equal(await flight.locator('#contact').inputValue(),'hard');
    assert.equal(await flight.locator('#outcome').inputValue(),'single');
    assert.equal(await flight.locator('#hand').inputValue(),match.away.hand);
    await flight.locator('#play').tap();
    assert.match(await flight.locator('#result').innerText(),/Single · Simulation complete/);
    assert.equal(await flight.locator('[data-fielder][data-react="lead"]').count(),1);
    assert.equal(await read(page),saved,'viewing flight cannot change saved game');
    await page.locator('#closeFlight').tap();
    assert.equal(await page.locator('#flightDialog').evaluate(e=>e.open),false);
    assert.equal(await read(page),saved,'closing flight cannot change saved game');
    // Continue actual gameplay after the preview, without double-crediting first swing.
    await page.locator('#zones button').nth(1).tap(); // UC
    await page.locator('.contact-quality-options button[data-contact=soft]').tap();
    await page.locator('#outcome').selectOption('out');
    await page.locator('#recordAfterChoices').tap();
    const after=await read(page),updated=JSON.parse(after);
    assert.equal(updated.atBats.length,2,'second real swing recorded exactly once');
    assert.equal(updated.atBats[1].zone,'UC');
    assert.equal(updated.atBats[1].power,'soft');
    assert.equal(updated.atBats[1].outcome,'out');
    await page.reload();
    assert.equal(await read(page),after,'reload preserves exact V7 game bytes');
    assert.equal(await page.locator('#viewFlight').isVisible(),false,'stale preview not automatically reopened');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),LEGACY_RAW);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),SNAPSHOT_RAW);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
    assert.deepEqual(errors,[],'no browser errors at '+width+'px');
    await context.close();
   }
  }finally{await browser.close();}
 });
}

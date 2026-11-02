'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

// Synthetic sentinel data only: this test never reads or writes an owner's real V6.3 saves.
test('375/390px result review survives handoff and reload in Chromium and WebKit without touching V6.3',async()=>{
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     const sentinel='synthetic-v63-preserve-'+engineName+'-'+width;
     const snapshot='synthetic-snapshot-preserve-'+engineName+'-'+width;
     await page.evaluate(([legacy,backup])=>{
      localStorage.setItem('warriors-hit-lab-v4',legacy);
      localStorage.setItem('warriors-hit-lab-v6-snapshot',backup);
     },[sentinel,snapshot]);
     await page.reload();
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     const review=page.locator('#seeLastSwing');
     assert.equal(await review.isVisible(),false,'no result shortcut before first rep');
     await page.locator('#zones button').nth(4).tap();
     await page.locator('.contact-quality-options button[data-contact=soft]').tap();
     await page.locator('#outcome').selectOption('double');
     await page.locator('#recordAfterChoices').tap();
     assert.equal(await review.isVisible(),true,'result shortcut shown after rep');
     const touch=await review.boundingBox();
     assert.ok(touch&&touch.height>=44&&touch.width>=44,'review button has 44px touch target');
     await review.tap();
     assert.match(await page.locator('#event').textContent(),/Net zone 5 of 9.*soft contact.*Simulated game result: double/);
     const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
     assert.equal(state.atBats.length,1,'review does not record another swing');
     assert.equal(state.realSwings[state.away.id],1,'real rep count remains one');
     const saved=JSON.stringify(state);
     await page.reload();
     assert.equal(await review.isVisible(),false,'handoff protects result controls after reload');
     await page.locator('#turn').tap();
     assert.equal(await review.isVisible(),true,'result shortcut restored after handoff');
     await review.tap();
     assert.match(await page.locator('#event').textContent(),/Net zone 5 of 9/);
     const final=await page.evaluate(()=>({
      v7:localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'),
      legacy:localStorage.getItem('warriors-hit-lab-v4'),
      snapshot:localStorage.getItem('warriors-hit-lab-v6-snapshot'),
      overflow:document.documentElement.scrollWidth>innerWidth+1
     }));
     assert.equal(final.v7,saved,'review and reload do not mutate V7 game');
     assert.equal(final.legacy,sentinel,'legacy career sentinel preserved');
     assert.equal(final.snapshot,snapshot,'legacy backup sentinel preserved');
     assert.equal(final.overflow,false,'no horizontal mobile overflow');
     assert.deepEqual(errors,[],'no uncaught browser errors');
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
});

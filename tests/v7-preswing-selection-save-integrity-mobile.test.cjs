'use strict';
// Pre-swing choices and keyboard navigation are UI-only until Record Swing.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 for(const [width,height] of [[375,667],[390,844]]){
  test(`${label} ${width}px pre-swing keyboard/zone/contact choices do not persist phantom tee reps`,async()=>{
   const browser=await engine.launch();
   try{
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.locator('#innings').selectOption('3');
     await page.locator('#start').tap();
     const initial=await page.evaluate(k=>localStorage.getItem(k),KEY);
     assert.ok(initial);
     assert.equal(await page.locator('#record').isDisabled(),true);
     await page.locator('#turn').tap();
     await page.locator('#turn').tap();
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),initial,'handoff acknowledgement is not a tee swing');
     const zones=page.locator('#zones button');
     await zones.nth(0).focus();
     await page.keyboard.press('ArrowRight');
     assert.equal(await zones.nth(1).evaluate(el=>el===document.activeElement),true,'keyboard navigates to next zone');
     await page.keyboard.press('ArrowDown');
     assert.equal(await zones.nth(4).evaluate(el=>el===document.activeElement),true,'keyboard navigates one row');
     await zones.nth(4).tap();
     await zones.nth(8).tap();
     await zones.nth(4).tap();
     const contact=page.locator('.contact-quality-options button');
     assert.ok(await contact.count()>0);
     await contact.first().tap();
     await contact.last().tap();
     await page.locator('#outcome').selectOption('out');
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),initial,'zone/contact/outcome previews cannot mutate saved match');
     assert.equal(await page.locator('#record').isEnabled(),true);
     await page.locator('#record').tap();
     const result=await page.evaluate(k=>{
      const raw=localStorage.getItem(k);const match=JSON.parse(raw);
      return {count:match.atBats.length,swings:match.realSwings.maddon,validation:window.HitLabMultiplayer.validateMatch(match)};
     },KEY);
     assert.equal(result.count,1,'exactly one explicitly recorded at-bat');
     assert.equal(result.swings,1,'exactly one real tee rep');
     assert.equal(result.validation.ok,true,JSON.stringify(result.validation));
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   }finally{await browser.close();}
  });
 }
}

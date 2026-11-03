'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const SAVE='warriors-hit-lab-v7-multiplayer-prototype';

for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 test('375x667 short-phone CTA reachability, real tee rep and resume: '+label,async()=>{
  const browser=await engine.launch();
  try{
   const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto(URL);
    const reach=async selector=>{
     const locator=page.locator(selector);
     await locator.scrollIntoViewIfNeeded();
     assert.equal(await locator.isVisible(),true,selector+' visible');
     const rect=await locator.boundingBox();
     assert.ok(rect&&rect.width>=30&&rect.height>=30,selector+' usable hit target');
     assert.ok(rect.x>=-1&&rect.x+rect.width<=376,selector+' within phone width');
     assert.ok(rect.y>=-1&&rect.y+rect.height<=668,selector+' reachable within viewport');
     return locator;
    };
    await (await reach('#start')).tap();
    assert.equal(await page.locator('#game').isVisible(),true);
    await (await reach('#turn')).tap();
    await (await reach('#zones button:nth-child(5)')).tap();
    assert.equal(await page.locator('#record').isEnabled(),true);
    await (await reach('#record')).tap();
    const first=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
    assert.equal(first.atBats.length,1);
    assert.equal(first.realSwings.dad+first.realSwings.maddon,1);
    await reach('#seeLastSwing');
    const bytes=await page.evaluate(key=>localStorage.getItem(key),SAVE);
    await page.reload();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),bytes,'reload preserves exact save');
    assert.equal(await page.locator('#game').isVisible(),true);
    await reach('#turn');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
    assert.deepEqual(errors,[],'no uncaught browser errors');
   }finally{await page.close();}
  }finally{await browser.close();}
 });
}

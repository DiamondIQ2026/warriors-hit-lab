'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 test('canonical and contextual Record Swing actions stay functional: '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const width of [375,390]){
    const page=await browser.newPage({viewport:{width,height:width===375?812:844},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     assert.equal(await page.locator('#record').isVisible(),true,'canonical action must remain visible for legacy gameplay tests');
     assert.equal(await page.locator('#recordAfterChoices').isVisible(),true,'contextual action is visible');
     assert.equal(await page.locator('#recordAfterChoices').isDisabled(),true,'zone required before recording');
     assert.equal(await page.locator('#record').isDisabled(),true);
     await page.locator('#zones button').nth(4).tap();
     assert.equal(await page.locator('#recordAfterChoices').isEnabled(),true);
     assert.equal(await page.locator('#record').isEnabled(),true);
     await page.locator('#recordAfterChoices').tap();
     const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
     assert.equal(saved.atBats.length,1);
     assert.equal(saved.realSwings.maddon,1);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });
}

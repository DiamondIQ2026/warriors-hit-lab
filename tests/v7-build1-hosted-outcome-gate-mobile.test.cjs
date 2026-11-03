'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 test('Build 1 '+name+': hosted game hides QA outcomes and always uses swing simulation',async()=>{
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
   await page.route('http://hitlab-qa.invalid/**',async route=>{
    const local=route.request().url().replace('http://hitlab-qa.invalid','http://127.0.0.1:8765');
    const response=await route.fetch({url:local});
    await route.fulfill({response});
   });
   await page.goto('http://hitlab-qa.invalid/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   assert.equal(await page.locator('.simulated-outcome-control').isVisible(),false);
   assert.equal(await page.locator('.simulated-outcome-control').evaluate(el=>el.hidden),true);
   await page.locator('#zones button').nth(4).tap();
   await page.evaluate(()=>{
    window.HitLabMultiplayer.resolveSimulatedOutcome=()=> 'out';
    document.getElementById('outcome').value='homer';
   });
   await page.locator('#recordAfterChoices').tap();
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
   assert.equal(saved.atBats.length,1);
   assert.equal(saved.atBats[0].outcome,'out');
   assert.equal(saved.score.maddon,0);
  }finally{await browser.close();}
 });
 test('Build 1 '+name+': local QA retains deterministic scenario controls',async()=>{
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:375,height:812}});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').click();
   await page.locator('#turn').click();
   assert.equal(await page.locator('.simulated-outcome-control').evaluate(el=>el.hidden),false);
   assert.equal(await page.locator('.simulated-outcome-control').isVisible(),true);
  }finally{await browser.close();}
 });
}

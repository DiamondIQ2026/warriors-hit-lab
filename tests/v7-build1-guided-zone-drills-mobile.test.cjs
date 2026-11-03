'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors',hand:'L'});
test('guided drills suggest real net zones deterministically without modifying save',()=>{
 let match=api.newMatch(home,away,3);
 assert.equal(api.nextZoneDrills(match).away.zone,'MC');
 assert.equal(api.nextZoneDrills(match).home.zone,'MC');
 match=api.recordSwing(match,{zone:'MC',power:'hard',outcome:'homer'});
 const before=JSON.stringify(match),drills=api.nextZoneDrills(match);
 assert.equal(drills.away.name,'Maddon');
 assert.notEqual(drills.away.zone,'MC');
 assert.equal(drills.home.zone,'MC');
 assert.deepEqual(api.nextZoneDrills(JSON.parse(before)),drills);
 assert.equal(JSON.stringify(match),before);
 const bad=JSON.parse(before);bad.score.maddon=99;
 assert.throws(()=>api.nextZoneDrills(bad),/Invalid match/);
});
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('guided zone drill appears on mobile and survives reload '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#trainingInsights > summary').tap();
     assert.equal(await page.locator('.guided-tee-drill').count(),2);
     assert.match(await page.locator('.guided-tee-drill').first().innerText(),/Zone 5/);
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#record').tap();
     assert.doesNotMatch(await page.locator('.guided-tee-drill').first().innerText(),/Zone 5/);
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await page.locator('#trainingInsights > summary').tap();
     assert.equal(await page.locator('.guided-tee-drill').count(),2);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

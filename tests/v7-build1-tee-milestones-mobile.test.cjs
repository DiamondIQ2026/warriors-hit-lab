'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors',hand:'L'});
test('tee milestones depend on real reps and zone variety, not simulated outcomes',()=>{
 let match=api.newMatch(home,away,3);
 assert.equal(api.practiceMilestones(match).away.total,0);
 match=api.recordSwing(match,{zone:'MC',power:'hard',outcome:'homer'});
 const raw=JSON.stringify(match);
 assert.deepEqual(api.practiceMilestones(match).away.awards.map(a=>a.id),['first-rep']);
 assert.equal(api.practiceMilestones(match).home.total,0);
 assert.deepEqual(api.practiceMilestones(JSON.parse(raw)),api.practiceMilestones(match));
 assert.equal(JSON.stringify(match),raw);
 const forged=JSON.parse(raw);forged.score.maddon=999;
 assert.throws(()=>api.practiceMilestones(forged),/Invalid match/);
});
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('mobile real tee milestone renders and reloads '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('.tee-milestone-player').first().innerText(),/0 milestones/);
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#recordAfterChoices').tap();
     assert.match(await page.locator('.tee-milestone-player').first().innerText(),/First Rep/);
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('.tee-milestone-player').first().innerText(),/First Rep/);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

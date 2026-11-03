'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors',hand:'L'});
test('practice coverage counts distinct logged net zones only, rejects forged saves',()=>{
 let match=api.newMatch(home,away,3);
 assert.equal(api.practiceCoverage(match).away.practicedZones,0);
 match=api.recordSwing(match,{zone:'MC',power:'hard',outcome:'homer'});
 match=api.recordSwing(match,{zone:'MC',power:'medium',outcome:'single'});
 assert.equal(api.practiceCoverage(match).away.practicedZones,1);
 assert.equal(api.practiceCoverage(match).away.unpracticedZones,8);
 const raw=JSON.stringify(match);
 assert.deepEqual(api.practiceCoverage(JSON.parse(raw)),api.practiceCoverage(match));
 assert.equal(JSON.stringify(match),raw);
 const forged=JSON.parse(raw);forged.score.maddon=99;
 assert.throws(()=>api.practiceCoverage(forged),/Invalid match/);
});
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('mobile practice zone coverage updates and reloads '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('.practice-coverage-row').first().innerText(),/0 \/ 9 zones practiced/);
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#recordAfterChoices').tap();
     assert.match(await page.locator('.practice-coverage-row').first().innerText(),/1 \/ 9 zones practiced/);
     assert.equal(await page.locator('.practice-coverage-row').first().locator('[role=progressbar]').getAttribute('aria-valuenow'),'1');
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('.practice-coverage-row').first().innerText(),/1 \/ 9 zones practiced/);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors',hand:'L'});
test('real tee training summary counts zones/contact without crediting simulated outcomes',()=>{
 let match=api.newMatch(home,away,3);
 match=api.recordSwing(match,{zone:'MC',power:'hard',outcome:'homer'});
 match=api.recordSwing(match,{zone:'MC',power:'soft',outcome:'out'});
 match=api.recordSwing(match,{zone:'TL',power:'medium',outcome:'out'});
 const raw=JSON.stringify(match),summary=api.trainingSummary(match);
 assert.equal(summary.totalSwings,3);
 assert.equal(summary.away.swings,3);
 assert.equal(summary.away.contact.hard,1);
 assert.equal(summary.away.contact.medium,1);
 assert.equal(summary.away.contact.soft,1);
 assert.equal(summary.home.swings,0);
 assert.equal(summary.away.zones.find(z=>z.zone==='MC').swings,2);
 assert.equal(summary.away.zones.find(z=>z.zone==='MC').soft,1);
 assert.equal(JSON.stringify(match),raw);
 assert.deepEqual(api.trainingSummary(JSON.parse(raw)),summary);
 const bad=JSON.parse(raw);bad.score.maddon=9;
 assert.throws(()=>api.trainingSummary(bad),/Invalid match/);
});
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('real tee zone analytics update and reload on mobile '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('homer');
     await page.locator('#recordAfterChoices').tap();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('#trainingTotal').innerText(),/1 actual tee swing/);
     assert.equal(await page.locator('#trainingZoneRows tr').count(),18);
     const row=page.locator('#trainingZoneRows tr').filter({hasText:'5'}).first();
     assert.ok(await row.count()>0);
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await page.locator('#trainingInsights > summary').tap();
     assert.match(await page.locator('#trainingTotal').innerText(),/1 actual tee swing/);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

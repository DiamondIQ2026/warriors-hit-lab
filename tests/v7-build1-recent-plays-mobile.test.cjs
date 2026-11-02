'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors',hand:'L'});
test('recent plays are reverse chronological, bounded, read-only and tamper protected',()=>{
 let match=api.newMatch(home,away,3);
 for(let i=0;i<12;i++)match=api.recordSwing(match,{zone:'MC',power:'medium',outcome:'out'});
 const before=JSON.stringify(match),plays=api.recentPlays(match);
 assert.equal(plays.length,8);
 assert.deepEqual(plays.map(x=>x.number),[12,11,10,9,8,7,6,5]);
 assert.equal(plays[0].batter,'Batter 3');
 assert.equal(JSON.stringify(match),before);
 assert.deepEqual(api.recentPlays(JSON.parse(before)),plays);
 assert.equal(api.recentPlays(match,3).length,3);
 assert.throws(()=>api.recentPlays(match,51),/limit/);
 const bad=JSON.parse(before);bad.score.maddon=99;
 assert.throws(()=>api.recentPlays(bad),/Invalid match/);
});
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('recent swings are visible and persist on mobile '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('double');
     await page.locator('#recordAfterChoices').tap();
     await page.locator('#recentPlays > summary').tap();
     assert.equal(await page.locator('#recentPlaysList li').count(),1);
     assert.match(await page.locator('#recentPlaysList').innerText(),/Real net zone 5 of 9/);
     assert.match(await page.locator('#recentPlaysList').innerText(),/Simulated DOUBLE/);
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await page.locator('#recentPlays > summary').tap();
     assert.equal(await page.locator('#recentPlaysList li').count(),1);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
const away=api.createProfile({id:'maddon',name:'Maddon',team:'Warriors',hand:'L'});
test('CSV exports 18 zone rows of real tee practice, safe against spreadsheet formula injection',()=>{
 const dangerous=api.createProfile({id:'dad',name:'=SUM(1+1)',team:'Titans',hand:'R'});
 let match=api.newMatch(dangerous,away,3);
 match=api.recordSwing(match,{zone:'MC',power:'hard',outcome:'homer'});
 const original=JSON.stringify(match),csv=api.practiceCsv(match);
 assert.equal(csv.trim().split('\r\n').length,19);
 assert.match(csv,/Real tee swings/);
 assert.match(csv,/"'\=SUM\(1\+1\)"/);
 assert.match(csv,/"Warriors","L","5","1","1","0","0"/);
 assert.equal(JSON.stringify(match),original);
 assert.equal(api.practiceCsv(JSON.parse(original)),csv);
 const forged=JSON.parse(original);forged.score.maddon=999;
 assert.throws(()=>api.practiceCsv(forged),/Invalid match/);
});
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('CSV download works on mobile without modifying saved game '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,acceptDownloads:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('homer');
     await page.locator('#record').tap();
     await page.locator('#trainingInsights > summary').tap();
     const raw=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     const downloadPromise=page.waitForEvent('download');
     await page.locator('#exportPracticeCsv').tap();
     const download=await downloadPromise;
     assert.equal(download.suggestedFilename(),'warriors-hit-lab-v7-tee-practice.csv');
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

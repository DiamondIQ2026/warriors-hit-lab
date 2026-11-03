'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Titans',hand:'R'});
const away=api.createProfile({id:'son',name:'Son',team:'Warriors',hand:'L'});
test('nine lineup batters retain correct individual hit totals after JSON resume',()=>{
 let m=api.newMatch(home,away,3);
 for(const outcome of ['single','double','homer','out','out','out'])
  m=api.recordSwing(m,{zone:'MC',power:'hard',outcome});
 const saved=JSON.stringify(m),box=api.boxScore(JSON.parse(saved));
 assert.equal(box.away.batters.length,9);
 assert.equal(box.home.batters.length,9);
 assert.equal(box.away.batters[0].singles,1);
 assert.equal(box.away.batters[0].average,'1.000');
 assert.equal(box.away.batters[3].average,'.000');
 assert.equal(box.away.batters[1].doubles,1);
 assert.equal(box.away.batters[2].homeRuns,1);
 assert.equal(box.away.batters[2].runsProduced,3);
 assert.equal(box.away.batters[3].outs,1);
 assert.equal(box.away.batters[8].atBats,0);
 assert.equal(box.away.batters.reduce((n,b)=>n+b.hits,0),box.away.hits);
 assert.equal(box.away.batters.reduce((n,b)=>n+b.runsProduced,0),box.away.runs);
 assert.equal(JSON.stringify(m),saved);
});
for(const [browserType,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('mobile lineup batting table updates and survives reload in '+name,async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,667],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     await page.locator('#liveBoxScore > summary').tap();
     await page.locator('#lineupStats > summary').tap();
     assert.equal(await page.locator('#lineupStatsRows tr').count(),20);
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#record').tap();
     const first=page.locator('#lineupStatsRows tr').nth(1);
     assert.equal(await first.locator('td').nth(1).innerText(),'1');
     assert.equal(await first.locator('td').nth(2).innerText(),'1');
     assert.equal(await first.locator('td').nth(3).innerText(),'1.000');
     const saved=await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype'));
     await page.reload();
     await page.locator('#liveBoxScore > summary').tap();
     await page.locator('#lineupStats > summary').tap();
     assert.equal(await page.locator('#lineupStatsRows tr').nth(1).locator('td').nth(2).innerText(),'1');
     assert.equal(await page.locator('#lineupStatsRows tr').nth(1).locator('td').nth(3).innerText(),'1.000');
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),saved);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

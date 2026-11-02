'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('Build 1 full mobile 3-inning game: real swing controls, pass-phone, box score, final recap, safe reload '+name,async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     await page.evaluate(()=>{localStorage.setItem('hitlab-v63-career-sentinel','KEEP_V63');localStorage.setItem('unrelated-qa-sentinel','KEEP_OTHER')});
     await page.locator('#start').tap();
     assert.equal(await page.locator('#turn').isVisible(),true);
     const outcomes=['homer',...Array(18).fill('out')];
     let previousSwings=0,handOffs=0;
     for(let i=0;i<outcomes.length;i++){
      if(await page.locator('#turn').isDisabled())break;
      if(!await page.locator('#swingPanel').isVisible()){await page.locator('#turn').tap();handOffs++;}
      await page.locator('#zones button').nth(4).tap();
      await page.locator('#outcome').selectOption(outcomes[i]);
      assert.equal(await page.locator('#recordAfterChoices').isEnabled(),true);
      await page.locator('#recordAfterChoices').tap();
      const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
      assert.equal(saved.atBats.length,++previousSwings);
      assert.equal(saved.realSwings.dad+saved.realSwings.maddon,previousSwings);
      if(i===4){
       const before=JSON.stringify(saved);
       await page.reload();
       assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
       assert.equal(await page.locator('#swingPanel').isVisible(),false);
      }
     }
     const final=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(final.status,'final');
     assert.equal(final.score.maddon,1);
     assert.equal(final.score.dad,0);
     assert.equal(final.atBats.length,19);
     assert.ok(handOffs>=6);
     assert.equal(await page.locator('#postgameRecap').isVisible(),true);
     assert.match(await page.locator('#recapWinner').innerText(),/Warriors/i);
     assert.equal(await page.locator('#turn').isDisabled(),true);
     await page.locator('#liveBoxScore > summary').tap();
     assert.equal(await page.locator('#boxScoreRows tr').count(),2);
     assert.equal(await page.locator('#boxScoreRows tr').first().locator('td').nth(10).innerText(),'1');
     await page.locator('#lineupStats > summary').tap();
     assert.equal(await page.locator('#lineupStatsRows tr').count(),20);
     const original=await page.evaluate(k=>localStorage.getItem(k),KEY);
     await page.reload();
     assert.equal(await page.locator('#postgameRecap').isVisible(),true);
     assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),original);
     assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'KEEP_V63');
     assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),'KEEP_OTHER');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

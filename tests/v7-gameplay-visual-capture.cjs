'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch();
 try {
  fs.mkdirSync('artifacts/v7-gameplay',{recursive:true});
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block'});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e.message)));
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').click();
   await page.locator('#turn').click();
   await page.locator('#zones button').nth(4).click();
   const data=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    buttonLabels:[...document.querySelectorAll('#zones button')].map(x=>x.textContent),
    recordBox:(()=>{const r=document.querySelector('#record').getBoundingClientRect();return {top:r.top,bottom:r.bottom}})(),
    viewport:innerHeight
   }));
   await page.screenshot({path:`artifacts/v7-gameplay/gameplay-${width}x${height}.png`,fullPage:true});
   // Capture a repeatable post-swing state so the new field/result treatment can be reviewed.
   await page.locator('#outcome').selectOption('double');
   await page.locator('#record').click();
   const outcome=await page.locator('.simulated-field').getAttribute('data-outcome');
   const outcomeText=await page.locator('#fieldOutcome').textContent();
   const fieldBox=await page.locator('.simulated-field').boundingBox();
   if(outcome!=='double'||!outcomeText.includes('DOUBLE')||!fieldBox||fieldBox.width<=0||fieldBox.height<=0)throw Error(JSON.stringify({width,height,outcome,outcomeText,fieldBox}));
   // Wait for the simulated result to reach its final position, not a random animation frame.
   await page.locator('.simulated-field .outcome-ball').evaluate(async el=>{
    await Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{})));
   });
   const markerState=await page.locator('.simulated-field .outcome-ball').evaluate(el=>({
    animationStates:el.getAnimations().map(animation=>animation.playState),
    opacity:getComputedStyle(el).opacity
   }));
   if(markerState.animationStates.some(state=>state==='running'))throw Error(JSON.stringify({width,height,markerState}));
   await page.screenshot({path:`artifacts/v7-gameplay/gameplay-double-${width}x${height}.png`,fullPage:true});
   console.log(JSON.stringify({width,height,outcome,outcomeText,fieldBox}));

   if(data.overflow||data.buttonLabels.join(',')!=='1,2,3,4,5,6,7,8,9'||errors.length)throw Error(JSON.stringify({width,height,data,errors}));
   console.log(JSON.stringify({width,height,...data,errors}));
   // Build 1 acceptance visual proof: score table, per-batter lineup, and
   // finished game recap. Screenshots are CI artifacts, not a deployment.
   await page.locator('#liveBoxScore > summary').click();
   await page.locator('#lineupStats > summary').click();
   await page.screenshot({path:`artifacts/v7-gameplay/gameplay-live-stats-${width}x${height}.png`,fullPage:true});
   const api=require('../v7/pass-and-play.cjs');
   const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R'});
   const away=api.createProfile({id:'maddon',name:'Maddon',team:'Tampa Warriors',hand:'L'});
   let finished=api.newMatch(home,away,3);
   finished=api.recordSwing(finished,{zone:'MC',power:'hard',outcome:'homer'});
   for(let n=0;n<40&&finished.status==='active';n++)
    finished=api.recordSwing(finished,{zone:'MC',power:'medium',outcome:'out'});
   if(finished.status!=='final')throw Error('Could not construct final game for visual capture');
   await page.evaluate(saved=>localStorage.setItem('warriors-hit-lab-v7-multiplayer-prototype',saved),JSON.stringify(finished));
   await page.reload();
   if(!await page.locator('#postgameRecap').isVisible())throw Error('Final recap not visible');
   await page.screenshot({path:`artifacts/v7-gameplay/gameplay-final-recap-${width}x${height}.png`,fullPage:true});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Final recap document overflow');
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

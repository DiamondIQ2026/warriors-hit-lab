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
   if(data.overflow||data.buttonLabels.join(',')!=='1,2,3,4,5,6,7,8,9'||errors.length)throw Error(JSON.stringify({width,height,data,errors}));
   console.log(JSON.stringify({width,height,...data,errors}));
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

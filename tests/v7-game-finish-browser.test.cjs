'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
for(const [mode,path] of [['cpu','experimental/visual-prototype.html'],['rivalry','multiplayer.html']]){
 test(mode+' provides consistent finish decisions without other-mode storage mutations',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/v7/'+path);
  const result=await page.evaluate(()=>({extra:window.HitLabFinishRules.decision({inning:3,scheduled:3,half:'bottom',home:2,away:2,thirdOut:true}),walkoff:window.HitLabFinishRules.decision({inning:3,scheduled:3,half:'bottom',home:3,away:2}),keys:Object.keys(localStorage)}));
  assert.equal(result.extra.kind,'next-inning');
  assert.equal(result.walkoff.reason,'walkoff');
  assert.equal(result.keys.includes(mode==='cpu'?'warriors-hit-lab-v7-multiplayer-prototype':'hitlab-v7-visual-prototype-only'),false);
 }finally{await browser.close();}
 });
}

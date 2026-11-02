'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

test('Family Rivalry mobile UI completes tied regulation and extra-inning walkoff without injected saves',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  const key='warriors-hit-lab-v7-multiplayer-prototype';
  await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
  await page.locator('#start').tap();
  const swing=async(outcome)=>{
   const turn=page.locator('#turn');
   if((await turn.textContent()).includes('PASS PHONE'))await turn.tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption(outcome);
   await page.locator('#record').tap();
  };
  for(let inning=1;inning<=3;inning++){
   for(let side=0;side<2;side++){
    for(let out=0;out<3;out++)await swing('out');
   }
  }
  let m=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(m.status,'active');assert.equal(m.inning,4);
  assert.equal(m.half,'top');assert.equal(m.atBats.length,18);
  await page.reload();
  for(const result of ['homer','out','out','out','homer','homer'])await swing(result);
  m=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(m.status,'final');assert.equal(m.winner,m.home.id);
  assert.equal(m.atBats.length,24);
  assert.equal(m.score[m.away.id],1);assert.equal(m.score[m.home.id],2);
  assert.match(await page.locator('#turn').textContent(),/GAME OVER/);
  assert.equal(await page.locator('#swingPanel').isVisible(),false);
  await page.reload();
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)).status,'final');
  assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 }finally{await browser.close();}
});
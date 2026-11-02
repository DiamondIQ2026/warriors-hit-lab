'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('375px CPU metallic scoreboard and nine-zone controls remain accessible during real swing and reload',async()=>{
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
 await page.goto('http://127.0.0.1:8765/v7/experimental/visual-prototype.html');
 await page.locator('[data-go="Play"]').first().click();
 await page.locator('[data-go="Game"]').first().click();
 const score=page.locator('.score').first();
 assert.equal(await score.isVisible(),true);
 const style=await score.evaluate(el=>({background:getComputedStyle(el).backgroundImage,border:getComputedStyle(el).borderTopWidth}));
 assert.match(style.background,/linear-gradient/);
 assert.equal(style.border,'2px');
 const zones=page.locator('.quick-zone button');
 assert.equal(await zones.count(),9);
 for(let i=0;i<9;i++){
  const button=zones.nth(i),box=await button.boundingBox();
  assert.ok(box.height>=44,'zone '+(i+1)+' meets touch target height');
  assert.equal(await button.getAttribute('aria-label'),'Batting zone '+(i+1)+' of 9');
 }
 const swing=page.locator('#swing'),bounds=await swing.boundingBox();
 assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=812,'record swing CTA is above fold');
 await zones.nth(4).tap();await swing.tap();
 const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('hitlab-v7-visual-prototype-only')));
 assert.equal(initial.zone,5);assert.equal(initial.reps,1);
 await page.reload();await page.locator('#resumeGame').click();
 const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('hitlab-v7-visual-prototype-only')));
 assert.equal(resumed.reps,1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),null);
 }finally{await browser.close();}
});
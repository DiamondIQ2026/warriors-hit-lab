'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('record swing action after contact choices uses same validated single-swing handler on phone sizes',async()=>{
 const browser=await chromium.launch();
 try{
 for(const [width,height] of [[375,812],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
 await page.locator('#start').tap();
 await page.locator('#turn').tap();
 const primary=page.locator('#record'),secondary=page.locator('#recordAfterChoices');
 assert.equal(await primary.isDisabled(),true);
 assert.equal(await secondary.isDisabled(),true);
 await page.locator('#zones button').nth(4).tap();
 await page.locator('.contact-quality-options button[data-contact=soft]').tap();
 assert.equal(await primary.isEnabled(),true);
 assert.equal(await secondary.isEnabled(),true);
 const position=await page.evaluate(()=>document.querySelector('#recordAfterChoices').getBoundingClientRect().top>document.querySelector('.contact-quality-options').getBoundingClientRect().top);
 assert.equal(position,true,'second action follows choices');
 await page.locator('#outcome').selectOption('double');
 await secondary.tap();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
 assert.equal(state.atBats.length,1,'exactly one simulated at bat');
 assert.equal(state.realSwings[state.away.id],1,'exactly one real swing');
 assert.equal(await primary.isDisabled(),true);
 assert.equal(await secondary.isDisabled(),true);
 await page.reload();
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')));
 assert.equal(restored.atBats.length,1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
 await page.close();
 }
 }finally{await browser.close();}
});
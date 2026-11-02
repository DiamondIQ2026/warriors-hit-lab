'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('active mobile game maintains above-fold CTA and scroll clearance under fixed navigation',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   await page.locator('#turn').tap();
   const cta=await page.locator('#record').boundingBox();
   assert.ok(cta&&cta.y>=0&&cta.y+cta.height<=height,'record CTA is visible on '+width);
   const nav=await page.locator('.v7-nav').boundingBox();
   const game=page.locator('#game');
   const pad=await game.evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom));
   assert.ok(nav&&pad>=nav.height,'game content reserves fixed-nav clearance');
   assert.equal(await page.locator('#zones button').count(),9);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('simulated 2D infield stays within field at 375px and 390px, before and after double',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
   await page.locator('#start').tap();
   const field=page.locator('.simulated-field'),infield=field.locator('.infield');
   const check=async()=>{
    const b=await field.boundingBox(),d=await infield.boundingBox();
    assert.ok(b&&d, 'field and infield have visible geometry');
    assert.ok(d.x>=b.x-1&&d.y>=b.y-1&&d.x+d.width<=b.x+b.width+1&&d.y+d.height<=b.y+b.height+1,JSON.stringify({width,field:b,infield:d}));
   };
   await check();
   await page.locator('#turn').tap();
   await page.locator('#zones button').nth(4).tap();
   await page.locator('#outcome').selectOption('double');
   await page.locator('#record').tap();
   assert.equal(await field.getAttribute('data-outcome'),'double');
   await check();
   assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v7-visual-prototype-only')),null);
   await page.close();
  }
 }finally{await browser.close();}
});
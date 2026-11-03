'use strict';
// Test-only acceptance for the canonical mobile Record Swing CTA.
// All browsers use synthetic isolated contexts; no production/legacy saves.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Record Swing scroll/occlusion '+engine+' at 375x667, 375x812, 390x844',async()=>{
  const browser=await browserType.launch();
  try{
   for(const [width,height] of [[375,667],[375,812],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    try{
     await page.goto(URL);
     await page.locator('#start').tap();
     await page.locator('#turn').tap();
     assert.equal(await page.locator('#record').count(),1);
     assert.equal(await page.locator('#recordAfterChoices').count(),0);
     assert.equal(await page.locator('#zones button').count(),9);
     assert.equal(await page.locator('.contact-quality-options button').count(),3);
     const initial=await page.evaluate(()=>{
      const r=s=>document.querySelector(s).getBoundingClientRect();
      return {cta:r('#record').toJSON(),nav:r('.v7-nav').toJSON(),overflow:document.documentElement.scrollWidth-innerWidth};
     });
     assert.ok(initial.cta.top>=0&&initial.cta.bottom<=initial.nav.top-4,
      'CTA must clear nav '+engine+' '+width+'x'+height+': '+JSON.stringify(initial));
     assert.ok(initial.overflow<=0,'horizontal overflow '+width+'x'+height);
     assert.equal(await page.locator('#record').isDisabled(),true);
     for(const selector of ['#zones button:nth-child(5)','.contact-quality-options button[data-contact="medium"]']){
      const el=page.locator(selector);
      await el.scrollIntoViewIfNeeded();
      // A scrollable control must have at least one unoccluded point above
      // the fixed nav and outside the fixed CTA, even after scrolling.
      const clear=await el.evaluate(node=>{
       const rect=node.getBoundingClientRect(),cta=document.querySelector('#record').getBoundingClientRect();
       const nav=document.querySelector('.v7-nav').getBoundingClientRect();
       for(const fx of [.25,.5,.75])for(const fy of [.2,.5,.8]){
        const x=rect.left+rect.width*fx,y=rect.top+rect.height*fy;
        if(y<0||y>=nav.top||y>=innerHeight)continue;
        if(x>=cta.left&&x<=cta.right&&y>=cta.top&&y<=cta.bottom)continue;
        const hit=document.elementFromPoint(x,y);
        if(hit===node||node.contains(hit))return true;
       }
       return false;
      });
      assert.ok(clear,'control obscured '+engine+' '+width+'x'+height+' '+selector);
      await el.tap({timeout:3000});
     }
     assert.equal(await page.locator('#record').isEnabled(),true);
     await page.locator('#record').tap();
     assert.equal(await page.locator('#record').isDisabled(),true);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v4')),null);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });
}

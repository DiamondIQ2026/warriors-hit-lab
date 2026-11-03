'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';

for(const [engine,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 test('future-version V7 match is preserved without unsafe downgrade: '+label,async()=>{
  const browser=await engine.launch();
  try{
   const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
   try{
    await page.goto(URL);
    const future=await page.evaluate(()=>{
     const api=window.HitLabMultiplayer;
     const lineup=prefix=>Array.from({length:9},(_,i)=>prefix+' '+(i+1));
     const home=api.createProfile('dad','Dad','Tampa Titans','R',lineup('Titan'));
     const away=api.createProfile('maddon','Maddon','Tampa Warriors','L',lineup('Warrior'));
     const match=api.newMatch(home,away,3);
     match.version=999;
     match.futureOnly={payload:'PRESERVE_UNSUPPORTED_VERSION'};
     return JSON.stringify(match);
    });
    await page.evaluate(([key,bytes])=>{
     localStorage.setItem(key,bytes);
     localStorage.setItem('hitlab-v63-career-sentinel','KEEP_V63');
     localStorage.setItem('unrelated-qa-sentinel','KEEP_OTHER');
    },[KEY,future]);
    await page.reload();
    assert.equal(await page.locator('#saveRecovery').isVisible(),true);
    assert.equal(await page.locator('#start').isDisabled(),true);
    assert.equal(await page.locator('#saveRecoveryExport').isVisible(),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),future);
    assert.match(await page.locator('#saveRecovery').innerText(),/Unsupported V7 match format/);
    await page.reload();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),future);
    assert.equal(await page.evaluate(()=>localStorage.getItem('hitlab-v63-career-sentinel')),'KEEP_V63');
    assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-qa-sentinel')),'KEEP_OTHER');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   }finally{await page.close();}
  }finally{await browser.close();}
 });
}

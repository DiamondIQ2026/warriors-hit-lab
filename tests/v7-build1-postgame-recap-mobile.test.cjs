'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../v7/pass-and-play.cjs');
const {chromium,webkit}=require('playwright');
const home=api.createProfile({id:'dad',name:'Dad',team:'Tampa Titans',hand:'R'});
const away=api.createProfile({id:'son',name:'Son',team:'Tampa Warriors',hand:'L'});
function completed(){
 let match=api.newMatch(home,away,3);
 match=api.recordSwing(match,{zone:'MC',power:'hard',outcome:'homer'});
 for(let i=0;i<40&&match.status==='active';i++)
  match=api.recordSwing(match,{zone:'MC',power:'medium',outcome:'out'});
 assert.equal(match.status,'final');
 return match;
}
test('postgame recap identifies winner, score and leading hitter after complete game and JSON reload',()=>{
 const match=completed(),raw=JSON.stringify(match),recap=api.postgameRecap(match);
 assert.equal(recap.winner,'Tampa Warriors');
 assert.equal(recap.winnerRuns,1);
 assert.equal(recap.loserRuns,0);
 assert.equal(recap.innings,3);
 assert.equal(recap.standout.name,'Batter 1');
 assert.equal(recap.standout.homeRuns,1);
 assert.equal(recap.standout.runsProduced,1);
 assert.deepEqual(api.postgameRecap(JSON.parse(raw)),recap);
 assert.equal(JSON.stringify(match),raw);
 const tampered=JSON.parse(raw);tampered.score.son=99;
 assert.throws(()=>api.postgameRecap(tampered),/Invalid match/);
 assert.equal(api.postgameRecap(api.newMatch(home,away,3)),null);
});
for(const [engine,name] of [[chromium,'Chromium'],[webkit,'WebKit']])
 test('final-game recap appears above swing panel and survives reload on '+name+' 375/390',async()=>{
  const browser=await engine.launch();
  try{
   for(const [width,height] of [[375,667],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    try{
     await page.goto('http://127.0.0.1:8765/v7/multiplayer.html');
     const raw=JSON.stringify(completed());
     await page.evaluate(value=>localStorage.setItem('warriors-hit-lab-v7-multiplayer-prototype',value),raw);
     await page.reload();
     assert.equal(await page.locator('#postgameRecap').isVisible(),true);
     assert.match(await page.locator('#recapWinner').innerText(),/Tampa Warriors WIN/);
     assert.match(await page.locator('#recapScore').innerText(),/FINAL/);
     assert.match(await page.locator('#recapStandout').innerText(),/Batter 1/);
     assert.equal(await page.locator('#turn').isDisabled(),true);
     assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v7-multiplayer-prototype')),raw);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 });

'use strict';
// V7 isolated difficulty + complete-game acceptance. Loopback-only result overrides.
// No legacy storage reads/writes. Exercise Chromium and WebKit at both phone sizes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
const engine=require('../v7/pass-and-play.cjs');

test('difficulty is deterministic, ordered by skill and compatible with older V7 saves',()=>{
 const a=engine.createProfile({id:'a',name:'A',team:'Away'});
 const h=engine.createProfile({id:'h',name:'H',team:'Home'});
 const old=engine.newMatch(h,a,3);delete old.difficulty;
 assert.equal(engine.validateMatch(old).ok,true);
 for(const level of ['rookie','standard','legend']){
  const m=engine.newMatch(h,a,3,level);
  assert.equal(engine.validateMatch(m).ok,true);
  assert.equal(engine.resolveSimulatedOutcome(m,{zone:'MC',power:'medium'}),engine.resolveSimulatedOutcome(m,{zone:'MC',power:'medium'}));
 }
 assert.throws(()=>engine.newMatch(h,a,3,'unknown'));
 const tampered=engine.newMatch(h,a,3,'rookie');tampered.difficulty='invalid';
 assert.equal(engine.validateMatch(tampered).ok,false);
 // Difficulty must alter the probability without altering recorded baseball rules.
 let rookieHits=0,legendHits=0;
 for(let n=0;n<150;n++){
  const base=engine.newMatch(h,a,3);
  base.atBats=Array.from({length:n},()=>({}));
  for(const [level,add] of [['rookie',()=>rookieHits++],['legend',()=>legendHits++]]){
   base.difficulty=level;
   if(engine.resolveSimulatedOutcome(base,{zone:'MC',power:'medium'})!=='out')add();
  }
 }
 assert.ok(rookieHits>legendHits,'Rookie should yield more contact than Legend over fixed seed samples');
});

for(const [browserName,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 for(const [width,height] of [[375,667],[390,844]]){
  for(const innings of [3,6,9]){
   test(`${browserName} ${width}x${height} ${innings}-inning Legend complete game, reload and final`,async()=>{
    const browser=await browserType.launch();
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(URL);
     await page.locator('#innings').selectOption(String(innings));
     await page.locator('#difficulty').selectOption('legend');
     await page.locator('#start').click();
     assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).difficulty,KEY),'legend');
     // Real user touch for the first rep, then DOM clicks for faster full-game regression.
     await page.locator('#turn').tap();
     await page.locator('#zones button').nth(4).tap();
     await page.locator('#outcome').selectOption('single');
     await page.locator('#recordAfterChoices').tap();
     // Away scores once; all remaining swings are outs. Home loses 0-1.
     const expected=innings*6+1;
     for(let index=1;index<expected;index++){
      if(index===Math.floor(expected/2)){
       const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
       await page.reload();
       assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before,'reload preserves exact save bytes');
       assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).difficulty,KEY),'legend');
      }
      const done=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).status==='final',KEY);
      if(done)break;
      await page.evaluate(()=>{
       const turn=document.getElementById('turn');
       if(!turn.disabled)turn.click();
       document.querySelector('#zones button:nth-child(5)').click();
       document.getElementById('outcome').value='out';
       document.getElementById('outcome').dispatchEvent(new Event('change',{bubbles:true}));
       document.getElementById('recordAfterChoices').click();
      });
     }
     const result=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
     assert.equal(result.status,'final');
     assert.equal(result.winner,result.away.id);
     assert.equal(result.score[result.away.id],1);
     assert.equal(result.score[result.home.id],0);
     assert.equal(result.realSwings[result.away.id]+result.realSwings[result.home.id],expected);
     assert.equal(engine.validateMatch(result).ok,true);
     assert.match(await page.locator('#recapScore').innerText(),/FINAL/);
     await page.reload();
     assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).status,KEY),'final');
     assert.deepEqual(errors,[]);
    }finally{await context.close();await browser.close();}
   });
  }
 }
}

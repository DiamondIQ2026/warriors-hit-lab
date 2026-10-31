'use strict';
// Real Chromium complete-outcome checks, using disposable test contexts only.
// Explicitly distinguish natural inning completion from forfeit-based finalization.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/',KEY='warriors-hit-lab-v4';
async function session(browser){
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('dialog',d=>d.accept());
 await page.goto(URL);
 await page.locator('#playerName').fill('Synthetic Tester');
 await page.locator('#myTeam').fill('Tampa Warriors');
 await page.locator('#hand').selectOption('R');
 await page.locator('#saveProfile').click();
 const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 const set=(id,value)=>page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))},value);
 return {page,context,errors,state,set};
}
test('Quick Play can complete innings and write career result without forfeiting',async()=>{
 const b=await chromium.launch();
 try{
 const t=await session(b);
 await t.set('gameMode','quick');
 await t.set('inningsSelect','3');
 // Out-only swing results: high random > all hit chances. CPU can score randomly;
 // force deterministic only after the profile is created.
 await t.page.evaluate(()=>{Math.random=()=>0.999999});
 await t.page.locator('#start').evaluate(e=>e.click());
 let swings=0;
 while((await t.state()).game && swings<65){
   await t.page.locator('[data-zone="LL"]').first().evaluate(e=>e.click());
   await t.page.locator('[data-power="soft"]').first().evaluate(e=>e.click());
   swings++;
 }
 const d=await t.state();
 assert.equal(d.game,null,'Game should reach final result without forfeit');
 assert.equal(d.games,1);
 assert.equal(d.completed[0].mode,'quick');
 assert.equal(d.completed[0].batting.ab,swings);
 assert.equal(d.stats.ab,swings);
 assert.equal(d.stats.swings,swings);
 await t.page.reload();
 assert.equal((await t.state()).games,1);
 assert.deepEqual(t.errors,[]);
 await t.context.close();
 }finally{await b.close()}
});
test('Season game finalization advances played count and cumulative season stats',async()=>{
 const b=await chromium.launch();
 try{
 const t=await session(b);
 await t.page.locator('#newSeason').evaluate(e=>e.click());
 await t.set('gameMode','season');
 await t.page.locator('#start').evaluate(e=>e.click());
 assert.equal((await t.state()).game.mode,'season');
 await t.page.locator('#forfeit').evaluate(e=>e.click());
 const d=await t.state();
 assert.equal(d.game,null);
 assert.equal(d.games,1);
 assert.equal(d.season.played,1);
 assert.equal(d.completed[0].mode,'season');
 assert.equal(d.completed[0].result,'LOSS');
 assert.equal(d.seasonStats['1'].games,1);
 await t.page.reload();
 assert.equal((await t.state()).season.played,1);
 assert.deepEqual(t.errors,[]);
 await t.context.close();
 }finally{await b.close()}
});
test('Tournament game finalization updates bracket and elimination',async()=>{
 const b=await chromium.launch();
 try{
 const t=await session(b);
 await t.set('tournamentSize','4');
 await t.page.locator('#newTournament').evaluate(e=>e.click());
 await t.set('gameMode','tournament');
 await t.page.locator('#start').evaluate(e=>e.click());
 assert.equal((await t.state()).game.mode,'tournament');
 await t.page.locator('#forfeit').evaluate(e=>e.click());
 const d=await t.state();
 assert.equal(d.game,null);
 assert.equal(d.completed[0].mode,'tournament');
 assert.equal(d.tournament.status,'complete');
 assert.equal(d.tournament.result,'Eliminated');
 assert.equal(d.tournamentHistory.length,1);
 await t.page.reload();
 assert.equal((await t.state()).tournament.status,'complete');
 assert.deepEqual(t.errors,[]);
 await t.context.close();
 }finally{await b.close()}
});

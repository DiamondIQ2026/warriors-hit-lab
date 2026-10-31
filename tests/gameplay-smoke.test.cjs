'use strict';
// Real Chromium gameplay regression smoke tests. Each test uses a disposable
// browser profile and a synthetic player; production is never accessed.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/';
const KEY='warriors-hit-lab-v4';
async function setup(browser){
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 await page.goto(BASE,{waitUntil:'domcontentloaded'});
 await page.locator('#playerName').fill('Synthetic Tester');
 await page.locator('#myTeam').fill('Tampa Warriors');
 await page.locator('#hand').selectOption('R');
 await page.locator('#saveProfile').click();
 const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal((await saved()).player.name,'Synthetic Tester');
 return {context,page,errors,saved};
}
test('Quick Play begins, records real swing input and survives reload',async()=>{
 const browser=await chromium.launch();
 try{
  const t=await setup(browser);
  await t.page.locator('#gameMode').selectOption('quick');
  await t.page.locator('#inningsSelect').selectOption('3');
  await t.page.locator('#start').click();
  let d=await t.saved();assert.equal(d.game.mode,'quick');
  const before=d.stats.swings||0;
  await t.page.locator('[data-zone="MC"]').first().evaluate(el=>el.click());
  await t.page.locator('[data-power="hard"]').first().evaluate(el=>el.click());
  d=await t.saved();
  assert.equal(d.stats.swings,before+1);
  assert.equal(d.zones.MC,1);
  const gameState={inning:d.game?.inning,outs:d.game?.outs,score:d.game?.score,other:d.game?.other,ab:d.game?.ab};
  await t.page.reload({waitUntil:'domcontentloaded'});
  const again=await t.saved();
  assert.equal(again.stats.swings,before+1);
  assert.deepEqual({inning:again.game?.inning,outs:again.game?.outs,score:again.game?.score,other:again.game?.other,ab:again.game?.ab},gameState);
  assert.deepEqual(t.errors,[]);
  await t.context.close();
 }finally{await browser.close()}
});
test('Season setup creates schedule and season game starts',async()=>{
 const browser=await chromium.launch();
 try{
  const t=await setup(browser);
  await t.page.locator('#newSeason').evaluate(el=>el.click());
  let d=await t.saved();
  assert.equal(d.season.phase,'regular');
  assert.ok(d.season.schedule.length>0);
  await t.page.locator('#gameMode').evaluate(el=>{el.value='season';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await t.page.locator('#start').evaluate(el=>el.click());
  d=await t.saved();
  assert.equal(d.game.mode,'season');
  assert.ok(d.game.opponent);
  await t.page.reload({waitUntil:'domcontentloaded'});
  d=await t.saved();
  assert.equal(d.game.mode,'season');
  assert.equal(d.season.played,0);
  assert.deepEqual(t.errors,[]);
  await t.context.close();
 }finally{await browser.close()}
});
test('Tournament setup creates bracket and starts tournament game',async()=>{
 const browser=await chromium.launch();
 try{
  const t=await setup(browser);
  await t.page.locator('#tournamentSize').evaluate(el=>{el.value='4';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await t.page.locator('#newTournament').evaluate(el=>el.click());
  let d=await t.saved();
  assert.equal(d.tournament.status,'active');
  assert.ok(d.tournament.rounds.length>0);
  assert.ok(d.tournament.nextOpponent);
  await t.page.locator('#gameMode').evaluate(el=>{el.value='tournament';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await t.page.locator('#start').evaluate(el=>el.click());
  d=await t.saved();
  assert.equal(d.game.mode,'tournament');
  await t.page.reload({waitUntil:'domcontentloaded'});
  d=await t.saved();
  assert.equal(d.game.mode,'tournament');
  assert.deepEqual(t.errors,[]);
  await t.context.close();
 }finally{await browser.close()}
});

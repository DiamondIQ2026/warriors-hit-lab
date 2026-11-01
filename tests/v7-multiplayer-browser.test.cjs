'use strict';
// Browser integration for isolated V7 multiplayer prototype only.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/multiplayer.html';
const KEY='warriors-hit-lab-v7-multiplayer-prototype';
test('two players alternate after three recorded outs; reload preserves turn and stats',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE);
 await page.locator('#start').click();
 assert.match(await page.locator('#turn').innerText(),/MADDON/);
 await page.locator('#turn').click();
 for(let i=0;i<3;i++){
  await page.locator('#zones button').first().click();
  await page.locator('#outcome').selectOption('out');
  await page.locator('#record').click();
 }
 assert.match(await page.locator('#turn').innerText(),/DAD/);
 let data=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(data.realSwings.maddon,3);
 assert.equal(data.realSwings.dad,0);
 assert.equal(data.half,'bottom');
 assert.equal(data.outs,0);
 await page.reload();
 assert.match(await page.locator('#turn').innerText(),/DAD/);
 await page.locator('#turn').click();
 await page.locator('#zones button').first().click();
 await page.locator('#record').click();
 data=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 assert.equal(data.realSwings.dad,1);
 assert.equal(data.atBats.length,4);
 assert.deepEqual(errors.filter(m=>!m.includes("Service worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag")),[]);
 await context.close();
 }finally{await browser.close()}
});
test('separate multiplayer save never creates or overwrites legacy career key',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
 const page=await context.newPage();
 await page.goto(BASE);
 await page.locator('#start').click();
 const keys=await page.evaluate(()=>Object.keys(localStorage));
 assert.ok(keys.includes(KEY));
 assert.equal(keys.includes('warriors-hit-lab-v4'),false);
 await context.close();
 }finally{await browser.close()}
});

test('375px mobile handoff is keyboard-operable and visible near scoreboard',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block'});
 try{
  const page=await context.newPage();
  await page.goto(BASE);
  await page.locator('#start').click();
  const turn=page.locator('#turn');
  assert.equal(await turn.evaluate(e=>e.tagName),'BUTTON');
  const box=await turn.boundingBox();
  assert.ok(box && box.y<480,'Phone handoff should be above the fold');
  await turn.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#swingPanel').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No horizontal overflow');
  await context.close();
 }finally{await browser.close()}
});
test('rapid double submission counts exactly one real tee swing',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
  const page=await context.newPage();
  await page.goto(BASE);
  await page.locator('#start').click();
  await page.locator('#turn').click();
  await page.locator('#zones button').first().click();
  await page.locator('#record').evaluate(e=>{e.click();e.click();});
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(saved.realSwings.maddon,1);
  assert.equal(saved.atBats.length,1);
  await context.close();
 }finally{await browser.close()}
});

test('custom multiplayer profiles and lineups survive reload without touching a preexisting solo career',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
  const page=await context.newPage();
  await page.goto(BASE);
  const sentinel='{"preserve":"real career sentinel","version":4}';
  await page.evaluate(value=>localStorage.setItem('warriors-hit-lab-v4',value),sentinel);
  await page.locator('#homeName').fill('Coach Dad');
  await page.locator('#homeTeam').fill('Titans Blue');
  await page.locator('#homeHand').selectOption('L');
  await page.locator('#awayName').fill('Junior');
  await page.locator('#awayTeam').fill('Warriors Red');
  await page.locator('#awayHand').selectOption('R');
  await page.locator('#awayLineup').fill(Array.from({length:9},(_,i)=>'Junior Batter '+(i+1)).join('\n'));
  await page.locator('#start').click();
  let m=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(m.home.name,'Coach Dad');
  assert.equal(m.home.hand,'L');
  assert.equal(m.away.name,'Junior');
  assert.equal(m.away.lineup[8],'Junior Batter 9');
  assert.match(await page.locator('#turn').innerText(),/JUNIOR/);
  await page.reload();
  m=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(m.away.team,'Warriors Red');
  assert.equal(m.home.team,'Titans Blue');
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v4')),sentinel);
  await context.close();
 }finally{await browser.close()}
});
test('invalid nine-person lineup blocks match creation without corrupting saved state',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
  const page=await context.newPage();
  await page.goto(BASE);
  await page.locator('#homeLineup').fill('Only One');
  await page.locator('#start').click();
  assert.match(await page.locator('#setupError').innerText(),/Nine lineup slots required/);
  assert.equal(await page.locator('#game').isVisible(),false);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null);
  await context.close();
 }finally{await browser.close()}
});

test('unified multiplayer and simulated flight preview leave career and game state untouched',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 try{
  const page=await context.newPage();
  await page.goto(BASE);
  await page.locator('#start').click();
  await page.locator('#turn').click();
  await page.locator('#zones button').first().click();
  await page.locator('#outcome').selectOption('double');
  await page.locator('#record').click();
  const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
  const show=page.locator('#viewFlight');
  assert.equal(await show.isVisible(),true);
  await show.click();
  assert.equal(await page.locator('#flightDialog').evaluate(e=>e.open),true);
  const frame=page.frameLocator('#flightFrame');
  await frame.locator('#play').click();
  await frame.locator('#skip').click();
  assert.match(await frame.locator('#result').innerText(),/Double.*complete/);
  await page.locator('#closeFlight').click();
  assert.equal(await page.locator('#flightDialog').evaluate(e=>e.open),false);
  assert.equal(await page.locator('#flightFrame').getAttribute('src'),null);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),before);
  assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v4')),null);
  await context.close();
 }finally{await browser.close()}
});

test('unified nine-zone selector supports keyboard arrows and announces selection',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 try{
  const page=await context.newPage();
  await page.goto(BASE);
  await page.locator('#start').click();
  await page.locator('#turn').click();
  const first=page.locator('#zones button').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  const second=page.locator('#zones button').nth(1);
  assert.equal(await second.evaluate(e=>document.activeElement===e),true);
  await page.keyboard.press('Enter');
  assert.equal(await second.getAttribute('aria-pressed'),'true');
  assert.equal(await first.getAttribute('aria-pressed'),'false');
  await page.locator('#record').click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),'warriors-hit-lab-v7-multiplayer-prototype');
  assert.equal(saved.atBats[0].zone,'UC');
  assert.equal(await second.getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }finally{await browser.close()}
});

test('metallic scoreboard displays both team scores with compact mobile geometry',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812}});
 try{
  const page=await context.newPage();
  await page.goto(BASE);
  await page.locator('#start').click();
  const score=page.locator('.score');
  assert.equal(await score.evaluate(e=>getComputedStyle(e).display),'grid');
  assert.match(await page.locator('#awayScore').innerText(),/Tampa Warriors 0/);
  assert.match(await page.locator('#homeScore').innerText(),/Tampa Titans 0/);
  assert.equal(await page.locator('.scoreMid').innerText(),'VS');
  const bounds=await score.boundingBox();
  assert.ok(bounds&&bounds.height<115,'Scoreboard should remain compact');
  const handoff=await page.locator('#turn').boundingBox();
  assert.ok(handoff&&handoff.y<480,'Primary handoff CTA must stay high');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }finally{await browser.close()}
});

'use strict';
// Real Chromium smoke checks on a local HTTP server and disposable browser contexts.
// Never point these tests at GitHub Pages or use a real player save.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const BASE = 'http://127.0.0.1:8765/';
const KEY = 'warriors-hit-lab-v4';
const sample = {
  version:4, player:{name:'Synthetic Tester',hand:'R'}, team:'Tampa Warriors',
  stats:{ab:21,h:9,hr:3}, teams:['Test Opponent'], completed:[],log:[],
  wins:3,losses:1,games:4,xp:120,
  season:{id:'season-fixture'}, tournament:{id:'tournament-fixture'},
  game:{inning:2,outs:1,score:4,other:2,lineupPos:3},
  seasonHistory:[{id:'old-season'}],tournamentHistory:[{id:'old-tournament'}]
};

async function isolatedPage(browser, saved) {
  const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});
  if(saved) await context.addInitScript(({key,value})=>{
    localStorage.setItem(key,JSON.stringify(value));
  },{key:KEY,value:saved});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  return {context,page,errors};
}

test('Chromium opens a synthetic saved career and retains it on reload',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const {context,page,errors}=await isolatedPage(browser,sample);
    const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    let restored=await read();
    assert.equal(restored.player.name,'Synthetic Tester');
    await page.reload({waitUntil:'domcontentloaded'});
    restored=await read();
    assert.equal(restored.stats.hr,3);
    assert.equal(restored.season.id,'season-fixture');
    assert.equal(restored.tournament.id,'tournament-fixture');
    assert.equal(restored.game.inning,2);
    assert.deepEqual(errors,[],'Unexpected JavaScript page errors');
    await context.close();
  }finally{await browser.close()}
});

test('Chromium exports and imports a synthetic JSON backup in separate contexts',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const first=await isolatedPage(browser,sample);
    const downloadPromise=first.page.waitForEvent('download');
    await first.page.locator('#exportSave').evaluate(el=>el.click());
    const download=await downloadPromise;
    assert.equal(download.suggestedFilename(),'warriors-hit-lab-save.json');
    const stream=await download.createReadStream();
    const chunks=[];for await(const chunk of stream)chunks.push(chunk);
    const bytes=Buffer.concat(chunks);
    const exported=JSON.parse(bytes.toString('utf8'));
    assert.equal(exported.player.name,'Synthetic Tester');
    assert.equal(exported.stats.hr,3);

    const second=await isolatedPage(browser);
    second.page.on('dialog',dialog=>dialog.accept());
    await second.page.locator('#importFile').setInputFiles({
      name:'synthetic-backup.json',mimeType:'application/json',buffer:bytes
    });
    await second.page.waitForFunction(key=>{
      const saved=localStorage.getItem(key);
      return saved && JSON.parse(saved).player?.name==='Synthetic Tester';
    },KEY);
    await second.page.reload({waitUntil:'domcontentloaded'});
    const restored=await second.page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(restored.stats.hr,3);
    assert.equal(restored.season.id,'season-fixture');
    assert.equal(restored.tournament.id,'tournament-fixture');
    assert.equal(restored.game.inning,2);
    assert.deepEqual(first.errors,[]);
    assert.deepEqual(second.errors,[]);
    await first.context.close();await second.context.close();
  }finally{await browser.close()}
});

'use strict';
// Corrupt CPU saves must show an explicit recovery gate, not silently discard new reps.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const GAME_URL='http://127.0.0.1:8765/v7/experimental/visual-prototype.html';
const KEY='hitlab-v7-visual-prototype-only';
const LEGACY='warriors-hit-lab-v4';
const SNAPSHOT='warriors-hit-lab-v6-snapshot';
const OLD='{"career":"cpu-recovery-sentinel"}';
const OLD_SNAPSHOT='{"snapshot":"cpu-recovery-sentinel"}';
const bad=['{not-json','[]','{"outs":-3}','{"bases":[true]}','{"schemaVersion":99}','{"reps":"bad"}','{"log":{}}','null','{"rivalryStats":{}}','{"rivalryTurn":"left"}','{"mode":{}}','{"trainingLog":[null]}','{"reps":1,"hits":3}'];
for(const [name,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
 test('Build 1 '+name+': CPU corrupt save requires export-first recovery at 375x667',async()=>{
  const browser=await browserType.launch({headless:true});
  try{
   for(const raw of bad){
    const context=await browser.newContext({viewport:{width:375,height:667},acceptDownloads:true,serviceWorkers:'block'});
    const page=await context.newPage();
    await page.addInitScript(({key,raw,legacy,snapshot})=>{
     localStorage.setItem(key,raw);
     localStorage.setItem('warriors-hit-lab-v4',legacy);
     localStorage.setItem('warriors-hit-lab-v6-snapshot',snapshot);
    },{key:KEY,raw,legacy:OLD,snapshot:OLD_SNAPSHOT});
    await page.goto(GAME_URL);
    assert.match(await page.locator('h1').innerText(),/Saved game needs attention/);
    assert.equal(await page.locator('#swing').count(),0,'recording is blocked while save is locked');
    assert.equal(await page.locator('[data-go="Play"]').count(),0,'play controls are not available before recovery');
    const saved=()=>page.evaluate(key=>localStorage.getItem(key),KEY);
    assert.equal(await saved(),raw);
    if(raw==='{not-json'){
     const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadRecovery').click()]);
     assert.equal(download.suggestedFilename(),'hit-lab-experimental-save-recovery.json');
     const stream=await download.createReadStream();
     const parts=[];for await(const chunk of stream)parts.push(chunk);
     assert.equal(Buffer.concat(parts).toString('utf8'),raw,'export is byte-exact');
    }
    await page.locator('#keepRecovery').click();
    assert.equal(await saved(),raw);
    await page.reload();
    assert.match(await page.locator('h1').innerText(),/Saved game needs attention/);
    await page.locator('#discardRecovery').click();
    await page.locator('#cancelDiscardRecovery').click();
    assert.equal(await saved(),raw,'cancel keeps original');
    await page.locator('#discardRecovery').click();
    await page.locator('#confirmDiscardRecovery').click();
    assert.equal(await saved(),null,'confirmed discard removes only experimental key');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),OLD);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),SNAPSHOT),OLD_SNAPSHOT);
    await page.locator('[data-go="Play"]').first().click();
    await page.locator('[data-go="Game"]').first().click();
    assert.equal(await page.locator('#swing').isVisible(),true,'game works after explicit discard');
    assert.notEqual(await saved(),raw);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await context.close();
   }
  }finally{await browser.close()}
 });
}

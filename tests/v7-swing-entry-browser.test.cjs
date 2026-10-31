'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/v7/swing-entry.html';
for(const width of [375,393]){
 test('mobile '+width+'px: tap zones/contact, record and undo without career writes',async()=>{
  const browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width,height:667},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  try{
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(BASE);
   await page.evaluate(()=>localStorage.setItem('warriors-hit-lab-v4','PRESERVE_REAL_CAREER_SENTINEL'));
   assert.equal(await page.locator('#record').isDisabled(),true);
   assert.equal(await page.locator('[data-zone]').count(),9);
   await page.locator('[data-zone="MC"]').tap();
   await page.locator('[data-contact="hard"]').tap();
   assert.equal(await page.locator('#record').isEnabled(),true);
   await page.locator('#hand').selectOption('L');
   await page.locator('#record').tap();
   assert.equal(await page.locator('#count').innerText(),'1');
   assert.match(await page.locator('#history').innerText(),/MC.*hard contact.*left-handed/);
   assert.equal(await page.locator('#record').isDisabled(),true);
   assert.equal(await page.locator('[data-zone="MC"]').getAttribute('aria-pressed'),'false');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('warriors-hit-lab-v4')),'PRESERVE_REAL_CAREER_SENTINEL');
   assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),['warriors-hit-lab-v4']);
   await page.locator('#undo').tap();
   assert.equal(await page.locator('#count').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close()}
 });
}
test('keyboard-only user can navigate grid and record a practice swing',async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
  const page=await context.newPage();await page.goto(BASE);
  await page.locator('[data-zone="UL"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.zone),'UC');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-zone="UC"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-contact="medium"]').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('[data-contact="medium"]').getAttribute('aria-pressed'),'true');
  await page.locator('#record').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#count').innerText(),'1');
 }finally{await context.close();await browser.close()}
});

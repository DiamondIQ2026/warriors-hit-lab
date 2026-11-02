'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/v7/multiplayer.html';
const V7_KEY='warriors-hit-lab-v7-multiplayer-prototype';
const LEGACY_KEY='warriors-hit-lab-v4';

test('375/390px: arrow keys honor 3x3 boundaries without selecting or modifying saves',async()=>{
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   const page=await context.newPage();
   try{
    await page.goto(URL);
    await page.evaluate(key=>localStorage.setItem(key,'v6.3-sentinel'),LEGACY_KEY);
    await page.locator('#start').tap();
    await page.locator('#turn').tap();
    const buttons=page.locator('#zones button');
    assert.equal(await buttons.count(),9);
    const focus=async expected=>{
     const actual=await page.evaluate(()=>[...document.querySelectorAll('#zones button')].indexOf(document.activeElement));
     assert.equal(actual,expected,'zone focus at '+width+'px');
    };
    await buttons.nth(0).focus();
    await page.keyboard.press('ArrowLeft');await focus(0);
    await page.keyboard.press('ArrowUp');await focus(0);
    await buttons.nth(4).focus();
    await page.keyboard.press('ArrowRight');await focus(5);
    await page.keyboard.press('ArrowDown');await focus(8);
    await page.keyboard.press('ArrowRight');await focus(8);
    await page.keyboard.press('ArrowDown');await focus(8);
    await page.keyboard.press('ArrowLeft');await focus(7);
    await page.keyboard.press('ArrowUp');await focus(4);
    await page.keyboard.press('ArrowUp');await focus(1);
    await page.keyboard.press('ArrowUp');await focus(1);
    assert.equal(await page.locator('#zones button[aria-pressed="true"]').count(),0,'focus is not a swing selection');
    assert.equal(await page.locator('#record').isDisabled(),true);
    const before=await page.evaluate(key=>localStorage.getItem(key),V7_KEY);
    await page.keyboard.press('Enter');
    assert.equal(await buttons.nth(1).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#record').isEnabled(),true);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),V7_KEY),before,'navigation/selection does not save a swing');
    await page.locator('#outcome').selectOption('single');
    await page.locator('#record').tap();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),V7_KEY);
    assert.equal(saved.atBats.length,1);
    assert.equal(saved.atBats[0].zone,'UC');
    assert.equal(saved.atBats[0].outcome,'single');
    assert.deepEqual(saved.bases,[true,false,false]);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_KEY),'v6.3-sentinel');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
});

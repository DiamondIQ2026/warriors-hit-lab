'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const v7 = path.join(__dirname, '..');
const hub = fs.readFileSync(path.join(v7, 'alpha', 'index.html'), 'utf8');

test('alpha hub exposes both distinct mobile gameplay destinations', () => {
  for (const href of ['../experimental/visual-prototype.html', '../multiplayer.html']) {
    assert.ok(hub.includes('href="' + href + '"'));
    assert.ok(fs.existsSync(path.resolve(v7, 'alpha', href)), href + ' exists');
  }
});

test('entry points do not falsely claim combined progress or production readiness', () => {
  assert.match(hub, /distinct prototypes/i);
  assert.match(hub, /development preview only/i);
  assert.match(hub, /no production deployment/i);
  assert.doesNotMatch(hub, /localStorage|sessionStorage|indexedDB/);
});

test('alpha entry actions remain before warnings and are accessible', () => {
  assert.ok(hub.indexOf('Open CPU & Training Alpha') < hub.indexOf('Development preview only'));
  assert.ok(hub.indexOf('Open Family Rivalry Alpha') < hub.indexOf('Development preview only'));
  assert.match(hub, /:focus-visible/);
  assert.match(hub, /viewport-fit=cover/);
});

test('CPU/Training prototype is not a V6.3 replacement', () => {
  const game = fs.readFileSync(path.join(v7, 'experimental', 'visual-prototype.html'), 'utf8');
  assert.ok(game.includes("const storeKey='hitlab-v7-visual-prototype-only'"));
});

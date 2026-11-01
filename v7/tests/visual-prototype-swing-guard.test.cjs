'use strict';

// Run from repository root: node --test v7/tests/visual-prototype-swing-guard.test.cjs
// Dependency-free simulated DOM regression tests for the isolated V7 prototype.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../experimental/visual-prototype.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'V7 prototype must contain its inline script');
const script = match[1].replace(
  "el('menuButton').onclick=",
  "window.__testState=()=>state;window.__advanceBases=advanceBases;el('menuButton').onclick="
);

function boot(saved = null) {
  const elements = {};
  const listeners = {};
  const timers = [];
  let savedValue = saved;
  const element = id => elements[id] ?? (elements[id] = {
    innerHTML: '', textContent: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {} }, appendChild() {}
  });
  const document = {
    getElementById: element,
    addEventListener: (name, handler) => { listeners[name] = handler; },
    createElement: () => ({ className: '', style: { setProperty() {} } })
  };
  const window = { scrollTo() {} };
  const localStorage = {
    getItem: () => savedValue,
    setItem: (_key, value) => { savedValue = value; }
  };
  const random = Object.create(Math);
  random.random = () => 0.99; // Predictable outs, no opponent hits.
  vm.runInNewContext(script, {
    document, window, localStorage, Math: random,
    setTimeout: handler => { timers.push(handler); }
  });
  return {
    state: () => window.__testState(),
    advanceBases: n => window.__advanceBases(n),
    click: (id = '', dataset = {}) => listeners.click({
      target: { id, dataset, closest() { return this; } }
    }),
    tick: () => { const timer = timers.shift(); assert.ok(timer); timer(); },
    saved: () => savedValue
  };
}

test('all nine batting zones are selectable', () => {
  const app = boot();
  app.click('', { go: 'Training' });
  app.click('', { drill: 'Zone Precision' });
  for (let zone = 1; zone <= 9; zone++) {
    app.click('', { zone: String(zone) });
    assert.equal(app.state().zone, zone);
  }
});

test('drill animation rejects duplicate swing, then permits next rep', () => {
  const app = boot();
  app.click('', { go: 'Training' });
  app.click('', { drill: 'Zone Precision' });
  app.click('swing');
  const zoneBefore = app.state().zone;
  const contactBefore = app.state().contact;
  app.click('', { zone: '5' }); // Active animation must not redraw the field.
  app.click('', { contact: 'HARD' });
  assert.equal(app.state().zone, zoneBefore);
  assert.equal(app.state().contact, contactBefore);
  app.click('swing');
  assert.equal(app.state().reps, 1);
  assert.equal(app.state().trainingLog.length, 1);
  app.tick();
  app.click('', { zone: '5' });
  app.click('', { contact: 'HARD' });
  assert.equal(app.state().zone, 5);
  assert.equal(app.state().contact, 'HARD');
  app.click('swing');
  assert.equal(app.state().reps, 2);
  assert.equal(app.state().trainingLog.length, 2);
  const refreshed = boot(app.saved());
  assert.equal(refreshed.state().animating, false, 'reload must clear transient lock');
});

test('game animation rejects duplicate swing; three outs end a half inning', () => {
  const app = boot();
  app.click('', { go: 'Play' });
  app.click('', { go: 'Game' });
  app.click('swing');
  app.click('swing');
  assert.equal(app.state().reps, 1);
  assert.equal(app.state().outs, 1);
  app.tick();
  app.click('swing');
  app.tick();
  app.click('swing');
  assert.equal(app.state().inning, 2);
  assert.equal(app.state().outs, 0);
  assert.equal(app.state().reps, 3);
});

test('bases loaded: single scores one, home run scores four', () => {
  const app = boot();
  app.state().bases = [true, true, true];
  assert.equal(app.advanceBases(1), 1);
  assert.deepEqual(Array.from(app.state().bases), [true, true, true]);
  assert.equal(app.advanceBases(4), 4);
  assert.deepEqual(Array.from(app.state().bases), [false, false, false]);
});

test('Stadium Mode includes Tropicana Field and preserves shared-phone handoff', () => {
  assert.match(html, /Tropicana Field — Dome/);
  assert.match(html, /stadium-trop/);
  const app = boot();
  app.state().mode = 'Family Rivalry';
  app.click('', { go: 'Game' });
  assert.equal(app.state().ballpark, 'trop');
  assert.equal(app.state().handoff, true);
  assert.equal(app.state().rivalryTurn, 'away');
  app.click('readyBatter');
  assert.equal(app.state().handoff, false);
});

test('stadium wall-contact result uses a distinct landing marker', () => {
  assert.match(html, /result\.startsWith\('OFF THE WALL'\)\?25/);
  assert.match(html, /wall-contact/);
  assert.match(html, /stadium-trop/);
});

test('Family Rivalry displays the active batter above controls and on handoff', () => {
  assert.match(html, /function activeBatterBanner\(\)/);
  assert.match(html, /return score\(\)\+activeBatterBanner\(\)/);
  assert.match(html, /batter-kicker/);
  assert.match(html, /PASS THE PHONE · YOU ARE UP/);
});

test('Family Rivalry final screen includes park and both players total runs', () => {
  assert.match(html, /TOTAL RUNS<br><b>/);
  assert.match(html, /rivalry\?state\.away\+state\.home:state\.home/);
  assert.match(html, /selectedPark\(\)\.name/);
});

test('three-inning Tropicana Field rivalry plays through all handoffs to final', () => {
  const app = boot();
  const state = app.state();
  state.mode = 'Family Rivalry';
  state.innings = 3;
  state.rivalName = 'Dad';
  state.homeName = 'Son';
  app.click('', { go: 'Game' });
  assert.equal(state.ballpark, 'trop');
  assert.equal(state.handoff, true);
  for (let inning = 1; inning <= 3; inning++) {
    assert.equal(state.inning, inning);
    assert.equal(state.rivalryTurn, 'away');
    app.click('readyBatter');
    assert.equal(state.handoff, false);
    for (let out = 0; out < 3; out++) {
      app.click('swing');
      assert.equal(state.animating, true);
      app.tick();
    }
    assert.equal(state.rivalryTurn, 'home');
    assert.equal(state.handoff, true);
    app.click('readyBatter');
    for (let out = 0; out < 3; out++) {
      app.click('swing');
      app.tick();
    }
    if (inning < 3) {
      assert.equal(state.rivalryTurn, 'away');
      assert.equal(state.handoff, true);
    }
  }
  assert.equal(state.gameFinished, false);
  assert.equal(state.extraInnings, 1);
  assert.equal(state.inning, 4);
  assert.equal(state.rivalryTurn, 'away');
  assert.equal(state.away, 0);
  assert.equal(state.home, 0);
  assert.equal(state.reps, 18);
  assert.equal(state.rivalryStats.away.reps, 9);
  assert.equal(state.rivalryStats.home.reps, 9);
});

test('quick nine-zone picker stays above the primary swing action', () => {
  assert.match(html, /function quickZonePicker\(\)/);
  assert.match(html, /aria-label="Quick batting zone selection"/);
  const game = html.slice(html.indexOf('function game(){'),html.indexOf('function training(){'));
  assert.ok(game.indexOf('quickZonePicker()') < game.indexOf('id="swing"'));
  const app = boot();
  app.state().mode = 'Family Rivalry';
  app.click('', { go: 'Game' });
  app.click('readyBatter');
  app.click('', { zone: '9' });
  assert.equal(app.state().zone, 9);
});

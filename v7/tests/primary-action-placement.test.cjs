'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'experimental', 'visual-prototype.html'), 'utf8');
const functionBody = (name, nextName) => {
  const start = source.indexOf('function ' + name + '(');
  const end = source.indexOf('function ' + nextName + '(', start + 1);
  assert.ok(start !== -1 && end > start, name + ' render function must exist');
  return source.slice(start, end);
};

test('home Play Ball primary action precedes tall hero and secondary mode tiles', () => {
  const home = functionBody('home', 'play');
  assert.ok(home.indexOf('data-go=\\"Play\\"') !== -1, 'home must offer Play');
  assert.ok(home.indexOf('data-go=\\"Play\\"') < home.indexOf('class=\\"hero\\"'), 'primary CTA must precede hero');
  assert.ok(home.indexOf('class=\\"hero\\"') < home.indexOf('class=\\"grid\\"'), 'secondary tiles follow hero');
});

test('game setup Play Ball primary action precedes matchup and configuration', () => {
  const play = functionBody('play', 'game');
  assert.match(play, /class=\\\"primary wide\\\" data-go=\\\"Game\\\"/);
  assert.ok(play.indexOf('data-go=\\"Game\\"') < play.indexOf('<h2>Matchup</h2>'));
  assert.ok(play.indexOf('data-go=\\"Game\\"') < play.indexOf('id=\\"mode\\"'));
});

test('game and drill keep primary swing recording prominent', () => {
  const game = functionBody('game', 'training');
  const drill = functionBody('drill', 'report');
  assert.match(game, /id=\\\"swing\\\"/);
  assert.match(drill, /id=\\\"swing\\\"/);
  assert.ok(game.indexOf('id=\\"swing\\"') < game.indexOf('+field()'), 'game swing CTA must precede field');
  assert.ok(drill.indexOf('id=\\"swing\\"') < drill.indexOf('+field()'), 'drill CTA must precede field');
});

test('visual prototype retains a dedicated V7-only storage namespace', () => {
  assert.match(source, /const storeKey='hitlab-v7-visual-prototype-only'/);
  assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem|clear)\(\s*['"](?:hitlab-v6|diamond)/i);
});

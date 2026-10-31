'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSwingGuard } = require('../v7/experimental/swing-guard.cjs');

test('suppresses repeated same-action taps inside interval', () => {
  let time = 1000;
  const guard = createSwingGuard({ now: () => time, intervalMs: 350 });
  assert.equal(guard.accept('swing:1'), true);
  time = 1050;
  assert.equal(guard.accept('swing:1'), false);
  time = 1350;
  assert.equal(guard.accept('swing:1'), true);
});
test('allows different action tokens and reset', () => {
  const guard = createSwingGuard({ now: () => 1000 });
  assert.equal(guard.accept('swing:1'), true);
  assert.equal(guard.accept('swing:2'), true);
  assert.equal(guard.accept('swing:2'), false);
  guard.reset();
  assert.equal(guard.accept('swing:2'), true);
});
test('rejects invalid input without writing saves', () => {
  const guard = createSwingGuard({ now: () => 1000 });
  assert.throws(() => guard.accept(''), TypeError);
  assert.throws(() => createSwingGuard({ intervalMs: -1 }), RangeError);
});

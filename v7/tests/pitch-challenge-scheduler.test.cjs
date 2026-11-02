'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FREQUENCIES, shouldRefreshPitchChallenge } = require('../experimental/pitch-challenge-scheduler.cjs');
const check = (frequency, totalRecordedSwings, halfInningRecordedSwings, enabled = true) =>
  shouldRefreshPitchChallenge({ frequency, totalRecordedSwings, halfInningRecordedSwings, enabled });

test('disabled challenges never display regardless of frequency', () => {
  for (const frequency of Object.values(FREQUENCIES)) assert.equal(check(frequency, 0, 0, false), false);
});
test('every-swing prompts before each recorded swing', () => {
  for (let n = 0; n < 10; n++) assert.equal(check(FREQUENCIES.EVERY_SWING, n, n), true);
});
test('every-three-swings refreshes before swing 1, 4, 7, 10', () => {
  for (let n = 0; n < 10; n++) assert.equal(check(FREQUENCIES.EVERY_THREE_SWINGS, n, Math.min(n, 2)), n % 3 === 0);
});
test('every-three-swings retains global cadence across inning boundaries', () => {
  assert.equal(check(FREQUENCIES.EVERY_THREE_SWINGS, 4, 0), false);
  assert.equal(check(FREQUENCIES.EVERY_THREE_SWINGS, 6, 0), true);
});
test('half-inning refreshes once on the first swing and resets for new half', () => {
  assert.equal(check(FREQUENCIES.HALF_INNING, 0, 0), true);
  assert.equal(check(FREQUENCIES.HALF_INNING, 1, 1), false);
  assert.equal(check(FREQUENCIES.HALF_INNING, 5, 0), true);
  assert.equal(check(FREQUENCIES.HALF_INNING, 6, 1), false);
});
test('invalid input fails closed rather than guessing a cadence', () => {
  const valid = { enabled: true, frequency: FREQUENCIES.EVERY_SWING, totalRecordedSwings: 2, halfInningRecordedSwings: 1 };
  for (const [key, value] of [['enabled', 1], ['frequency', 'sometimes'], ['totalRecordedSwings', -1], ['totalRecordedSwings', 1.5], ['totalRecordedSwings', Number.MAX_SAFE_INTEGER + 1], ['halfInningRecordedSwings', NaN], ['halfInningRecordedSwings', '0']]) {
    assert.throws(() => shouldRefreshPitchChallenge({ ...valid, [key]: value }));
  }
  assert.throws(() => shouldRefreshPitchChallenge({ ...valid, halfInningRecordedSwings: 3 }));
  assert.throws(() => shouldRefreshPitchChallenge());
});
test('read-only call never mutates supplied state', () => {
  const input = Object.freeze({ enabled: true, frequency: FREQUENCIES.HALF_INNING, totalRecordedSwings: 12, halfInningRecordedSwings: 0 });
  assert.equal(shouldRefreshPitchChallenge(input), true);
  assert.deepEqual(input, { enabled: true, frequency: FREQUENCIES.HALF_INNING, totalRecordedSwings: 12, halfInningRecordedSwings: 0 });
});

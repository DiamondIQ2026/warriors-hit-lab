'use strict';

/**
 * V7 HL-007 experimental pitch challenge frequency scheduler.
 * Read-only, stateless: this module never touches saves, the DOM, or gameplay.
 * Inputs are counts of ALREADY RECORDED swings before the next swing.
 *
 * every-swing: refresh before each swing.
 * every-three-swings: refresh before swings 1, 4, 7, ... globally.
 * half-inning: refresh before the first swing of each new half-inning.
 */
const FREQUENCIES = Object.freeze({
  EVERY_SWING: 'every-swing',
  EVERY_THREE_SWINGS: 'every-three-swings',
  HALF_INNING: 'half-inning',
});

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function shouldRefreshPitchChallenge({
  enabled = false,
  frequency = FREQUENCIES.EVERY_SWING,
  totalRecordedSwings,
  halfInningRecordedSwings,
} = {}) {
  if (typeof enabled !== 'boolean') throw new TypeError('enabled must be boolean');
  if (!Object.values(FREQUENCIES).includes(frequency)) throw new RangeError('unsupported pitch frequency');
  if (!isCount(totalRecordedSwings) || !isCount(halfInningRecordedSwings)) {
    throw new RangeError('recorded swing counts must be nonnegative safe integers');
  }
  if (halfInningRecordedSwings > totalRecordedSwings) {
    throw new RangeError('half-inning swings cannot exceed total swings');
  }
  if (!enabled) return false;
  if (frequency === FREQUENCIES.EVERY_SWING) return true;
  if (frequency === FREQUENCIES.EVERY_THREE_SWINGS) return totalRecordedSwings % 3 === 0;
  return halfInningRecordedSwings === 0;
}

module.exports = { FREQUENCIES, shouldRefreshPitchChallenge };

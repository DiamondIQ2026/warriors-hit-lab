'use strict';
// V7 experimental input guard. Not connected to V6.3 gameplay or save storage.
// Caller supplies a monotonic clock and explicitly resets on game/session changes.
function createSwingGuard({ intervalMs = 350, now = () => Date.now() } = {}) {
  if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new RangeError('intervalMs must be nonnegative');
  let lastTime = -Infinity;
  let lastToken = null;
  return Object.freeze({
    accept(token) {
      if (typeof token !== 'string' || !token) throw new TypeError('nonempty action token required');
      const time = now();
      if (!Number.isFinite(time)) throw new TypeError('clock must return a finite number');
      if (token === lastToken && time >= lastTime && time - lastTime < intervalMs) return false;
      lastToken = token;
      lastTime = time;
      return true;
    },
    reset() { lastTime = -Infinity; lastToken = null; }
  });
}
module.exports = { createSwingGuard };

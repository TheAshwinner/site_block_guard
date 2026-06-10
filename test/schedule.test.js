import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hm, isWithinWindow } from '../src/schedule.js';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const NIGHT = { startMin: hm(22), endMin: hm(7), days: ALL_DAYS }; // crosses midnight
const DAY = { startMin: hm(9), endMin: hm(17), days: ALL_DAYS }; // does not cross

test('non-crossing window: boundaries are start-inclusive, end-exclusive', () => {
  assert.equal(isWithinWindow(DAY, hm(8, 59), 1), false);
  assert.equal(isWithinWindow(DAY, hm(9, 0), 1), true); // start inclusive
  assert.equal(isWithinWindow(DAY, hm(12, 0), 1), true);
  assert.equal(isWithinWindow(DAY, hm(16, 59), 1), true);
  assert.equal(isWithinWindow(DAY, hm(17, 0), 1), false); // end exclusive
});

test('midnight-crossing 22:00–07:00: both sides of midnight (AT2/AT5)', () => {
  assert.equal(isWithinWindow(NIGHT, hm(21, 59), 1), false);
  assert.equal(isWithinWindow(NIGHT, hm(22, 0), 1), true); // start inclusive
  assert.equal(isWithinWindow(NIGHT, hm(23, 0), 1), true);
  assert.equal(isWithinWindow(NIGHT, hm(0, 0), 2), true); // just after midnight
  assert.equal(isWithinWindow(NIGHT, hm(6, 59), 2), true);
  assert.equal(isWithinWindow(NIGHT, hm(7, 0), 2), false); // end exclusive
  assert.equal(isWithinWindow(NIGHT, hm(12, 0), 1), false);
});

test('days-of-week gate applies to the START day of the window', () => {
  // Window runs only on Friday(5) nights.
  const friNight = { startMin: hm(22), endMin: hm(7), days: [5] };
  // Friday 23:00 -> inside.
  assert.equal(isWithinWindow(friNight, hm(23, 0), 5), true);
  // Saturday 02:00 belongs to the Friday-night window -> inside.
  assert.equal(isWithinWindow(friNight, hm(2, 0), 6), true);
  // Saturday 23:00 is a new (Saturday) window, which is not scheduled -> outside.
  assert.equal(isWithinWindow(friNight, hm(23, 0), 6), false);
  // Friday 02:00 is the tail of THURSDAY's window, not scheduled -> outside.
  assert.equal(isWithinWindow(friNight, hm(2, 0), 5), false);
});

test('excluded day with all-week-off window is never inside', () => {
  const off = { startMin: hm(22), endMin: hm(7), days: [] };
  assert.equal(isWithinWindow(off, hm(23, 0), 3), false);
});

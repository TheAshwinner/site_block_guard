// Pure schedule logic — NO chrome.* and NO implicit clock, so it is unit-testable
// under `node --test`. The caller passes the current time explicitly.

/** Convert an hour/minute pair to minutes-since-midnight. */
export function hm(hour, minute = 0) {
  return hour * 60 + minute;
}

/**
 * Is `nowMinutes` (minutes since midnight, 0..1439) on weekday `dayOfWeek`
 * (0=Sun..6=Sat) inside the given window?
 *
 * window = { startMin, endMin, days: number[] }
 *   - Non-crossing window (startMin <= endMin): inside if start <= now < end.
 *   - Midnight-crossing window (startMin > endMin): inside if now >= start OR now < end.
 *
 * Boundary handling: the start minute is inclusive, the end minute is exclusive.
 * (For 22:00–07:00 that means blocked at 22:00, allowed at 07:00.)
 *
 * The days-of-week gate is applied to the day the window STARTED. For the
 * post-midnight portion of a crossing window, that is the previous day.
 */
export function isWithinWindow(window, nowMinutes, dayOfWeek) {
  const { startMin, endMin, days } = window;
  const crosses = startMin > endMin;

  const inTime = crosses
    ? nowMinutes >= startMin || nowMinutes < endMin
    : nowMinutes >= startMin && nowMinutes < endMin;

  if (!inTime) return false;

  let startDay = dayOfWeek;
  if (crosses && nowMinutes < endMin) {
    // We're in the early-morning tail; the window opened the previous evening.
    startDay = (dayOfWeek + 6) % 7;
  }
  return days.includes(startDay);
}

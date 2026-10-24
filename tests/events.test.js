import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ERAS, EVENT_ERAS } from '../lib/cards.js';
import { canOpenEra, eventPhase, formatCountdown, msUntilChange } from '../lib/events.js';

const starts = Date.parse('2026-10-20T00:00:00Z');
const ends = Date.parse('2026-10-27T00:00:00Z');
const event = { code: 'XX', event: { starts: '2026-10-20T00:00:00Z', ends: '2026-10-27T00:00:00Z' } };
const standard = { code: 'YY' };

test('an event album is open only inside its window', () => {
  assert.equal(eventPhase(event, starts - 1), 'upcoming');
  assert.equal(eventPhase(event, starts), 'live');
  assert.equal(eventPhase(event, ends - 1), 'live');
  assert.equal(eventPhase(event, ends), 'ended');
  assert.equal(canOpenEra(event, starts - 1), false);
  assert.equal(canOpenEra(event, starts), true);
  assert.equal(canOpenEra(event, ends - 1), true);
  assert.equal(canOpenEra(event, ends), false);
});

test('standard albums are always open', () => {
  assert.equal(eventPhase(standard, 0), 'open');
  assert.equal(canOpenEra(standard, ends + 1e12), true);
  assert.equal(msUntilChange(standard, starts), 0);
});

test('the countdown runs to the next change', () => {
  assert.equal(msUntilChange(event, starts - 5000), 5000);
  assert.equal(msUntilChange(event, ends - 7000), 7000);
  assert.equal(msUntilChange(event, ends), 0);
});

test('countdowns read well at every scale', () => {
  assert.equal(formatCountdown(3 * 86400e3 + 4 * 3600e3 + 59e3), '3d 4h');
  assert.equal(formatCountdown(5 * 3600e3 + 2 * 60e3 + 9e3), '5h 02m 09s');
  assert.equal(formatCountdown(4 * 60e3 + 9e3 + 999), '4m 09s');
  assert.equal(formatCountdown(-1), '0m 00s');
});

test('every event has a valid window and a blurb', () => {
  assert.ok(EVENT_ERAS.length > 0);
  for (const era of EVENT_ERAS) {
    const a = Date.parse(era.event.starts), b = Date.parse(era.event.ends);
    assert.ok(Number.isFinite(a) && Number.isFinite(b), `${era.name} has unparseable dates`);
    // An explicit offset, so the window doesn't move with the server's time zone.
    assert.match(era.event.starts, /(Z|[+-]\d\d:\d\d)$/, `${era.name} starts`);
    assert.match(era.event.ends, /(Z|[+-]\d\d:\d\d)$/, `${era.name} ends`);
    assert.ok(a < b, `${era.name} ends before it starts`);
    assert.ok(era.event.blurb, `${era.name} has no blurb`);
    assert.ok(ERAS.includes(era));
  }
});

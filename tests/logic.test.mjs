import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fToC, formatTemp, modeForDate, countdown, formatClock, parseDuration, formatRemaining,
} from '../src/logic.js';

test('fToC rounds to the same °C values the recipe prints', () => {
  assert.equal(fToC(165), 74);
  assert.equal(fToC(172), 78);
  assert.equal(fToC(175), 79);
  assert.equal(fToC(176), 80);
  assert.equal(fToC(160), 71);
  assert.equal(fToC(170), 77);
  assert.equal(fToC(40), 4);
  assert.equal(fToC(180), 82);
});

test('formatTemp renders ranges and single values in either unit', () => {
  assert.equal(formatTemp('165-172', 'F'), '165–172°F');
  assert.equal(formatTemp('165-172', 'C'), '74–78°C');
  assert.equal(formatTemp('175', 'C'), '79°C');
  assert.equal(formatTemp('170+', 'F'), '170°F+');
  assert.equal(formatTemp('165+', 'C'), '74°C+');
});

test('modeForDate picks the right day of the plan (local time)', () => {
  assert.equal(modeForDate(new Date(2026, 10, 24, 20)), 'before');
  assert.equal(modeForDate(new Date(2026, 10, 25, 0, 1)), 'prep');
  assert.equal(modeForDate(new Date(2026, 10, 25, 23, 59)), 'prep');
  assert.equal(modeForDate(new Date(2026, 10, 26, 6)), 'day');
  assert.equal(modeForDate(new Date(2026, 10, 26, 23)), 'day');
  assert.equal(modeForDate(new Date(2026, 10, 27, 9)), 'after');
});

test('countdown subtracts minute offsets, including across midnight', () => {
  const serve = new Date(2026, 10, 27, 0, 10);
  const [t30, t3] = countdown(serve, [30, 3]);
  assert.equal(t30.getDate(), 26);
  assert.equal(t30.getHours(), 23);
  assert.equal(t30.getMinutes(), 40);
  assert.equal(t3.getMinutes(), 7);
});

test('formatClock is a short 12-hour clock', () => {
  assert.equal(formatClock(new Date(2026, 10, 26, 15, 5)), '3:05 PM');
  assert.equal(formatClock(new Date(2026, 10, 26, 0, 0)), '12:00 AM');
});

test('parseDuration reads s / m / h tokens', () => {
  assert.equal(parseDuration('90s'), 90);
  assert.equal(parseDuration('5m'), 300);
  assert.equal(parseDuration('2h'), 7200);
  assert.equal(parseDuration('1m30s'), 90);
  assert.equal(parseDuration('nonsense'), 0);
});

test('formatRemaining shows m:ss and h:mm:ss', () => {
  assert.equal(formatRemaining(0), '0:00');
  assert.equal(formatRemaining(65), '1:05');
  assert.equal(formatRemaining(7200), '2:00:00');
  assert.equal(formatRemaining(-5), '0:00');
});

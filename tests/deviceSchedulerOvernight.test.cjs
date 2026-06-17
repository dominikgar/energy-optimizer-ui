const test = require('node:test');
const assert = require('node:assert/strict');
const { scheduleDevice } = require('../lib/deviceScheduler.ts');

test('builds a contiguous schedule across midnight using two days of prices', () => {
  const result = scheduleDevice([
    { start: '22:00', pricePerKwh: 0.5, durationMinutes: 60, dayOffset: 0, date: '2026-06-17' },
    { start: '23:00', pricePerKwh: 0.4, durationMinutes: 60, dayOffset: 0, date: '2026-06-17' },
    { start: '00:00', pricePerKwh: 0.1, durationMinutes: 60, dayOffset: 1, date: '2026-06-18' },
    { start: '01:00', pricePerKwh: 0.2, durationMinutes: 60, dayOffset: 1, date: '2026-06-18' },
    { start: '02:00', pricePerKwh: 0.9, durationMinutes: 60, dayOffset: 1, date: '2026-06-18' }
  ], {
    energyRequiredKwh: 3,
    maxPowerKw: 1,
    earliestStart: '22:00',
    latestEnd: '03:00',
    requireContiguous: true
  });

  assert.equal(result.feasible, true);
  assert.equal(result.crossesMidnight, true);
  assert.equal(result.windowDurationHours, 5);
  assert.deepEqual(result.slots.map((slot) => [slot.startDate, slot.start, slot.end]), [
    ['2026-06-17', '23:00', '24:00'],
    ['2026-06-18', '00:00', '01:00'],
    ['2026-06-18', '01:00', '02:00']
  ]);
  assert.ok(Math.abs(result.totalCost - 0.7) < 1e-9);
});

test('selects the cheapest disjoint overnight intervals chronologically', () => {
  const result = scheduleDevice([
    { start: '22:00', pricePerKwh: 0.8, durationMinutes: 60, dayOffset: 0 },
    { start: '23:00', pricePerKwh: 0.1, durationMinutes: 60, dayOffset: 0 },
    { start: '00:00', pricePerKwh: 0.9, durationMinutes: 60, dayOffset: 1 },
    { start: '01:00', pricePerKwh: 0.2, durationMinutes: 60, dayOffset: 1 }
  ], {
    energyRequiredKwh: 2,
    maxPowerKw: 1,
    earliestStart: '22:00',
    latestEnd: '02:00',
    requireContiguous: false
  });

  assert.equal(result.feasible, true);
  assert.deepEqual(result.slots.map((slot) => [slot.startDayOffset, slot.start]), [
    [0, '23:00'],
    [1, '01:00']
  ]);
});

test('returns unfeasible when next-day prices are missing', () => {
  const result = scheduleDevice([
    { start: '22:00', pricePerKwh: 0.1, durationMinutes: 60, dayOffset: 0 },
    { start: '23:00', pricePerKwh: 0.2, durationMinutes: 60, dayOffset: 0 }
  ], {
    energyRequiredKwh: 3,
    maxPowerKw: 1,
    earliestStart: '22:00',
    latestEnd: '02:00',
    requireContiguous: false
  });

  assert.equal(result.feasible, false);
  assert.equal(result.crossesMidnight, true);
  assert.match(result.reason, /maksymalnie 2.00 kWh/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { scheduleDevice } = require('../lib/deviceScheduler.ts');

function intervals(prices) {
  return prices.map((pricePerKwh, hour) => ({
    start: `${String(hour).padStart(2, '0')}:00`,
    pricePerKwh,
    durationMinutes: 60
  }));
}

test('finds the cheapest contiguous window', () => {
  const result = scheduleDevice(intervals([0.8, 0.1, 0.2, 0.9]), {
    energyRequiredKwh: 2,
    maxPowerKw: 1,
    earliestStart: '00:00',
    latestEnd: '04:00',
    requireContiguous: true
  });

  assert.equal(result.feasible, true);
  assert.deepEqual(result.slots.map((slot) => [slot.start, slot.end]), [
    ['01:00', '02:00'],
    ['02:00', '03:00']
  ]);
  assert.ok(Math.abs(result.totalCost - 0.3) < 1e-9);
});

test('selects disjoint cheapest intervals for interruptible devices', () => {
  const result = scheduleDevice(intervals([0.1, 0.9, 0.2, 0.8]), {
    energyRequiredKwh: 2,
    maxPowerKw: 1,
    earliestStart: '00:00',
    latestEnd: '04:00',
    requireContiguous: false
  });

  assert.equal(result.feasible, true);
  assert.deepEqual(result.slots.map((slot) => slot.start), ['00:00', '02:00']);
  assert.ok(Math.abs(result.totalCost - 0.3) < 1e-9);
});

test('supports an interval ending at 24:00', () => {
  const result = scheduleDevice([
    { start: '23:00', pricePerKwh: 0.15, durationMinutes: 60 }
  ], {
    energyRequiredKwh: 1,
    maxPowerKw: 1,
    earliestStart: '23:00',
    latestEnd: '24:00',
    requireContiguous: true
  });

  assert.equal(result.feasible, true);
  assert.equal(result.slots[0].end, '24:00');
});

test('returns a safe unfeasible result when available energy is insufficient', () => {
  const result = scheduleDevice(intervals([0.1, 0.2]), {
    energyRequiredKwh: 3,
    maxPowerKw: 1,
    earliestStart: '00:00',
    latestEnd: '02:00',
    requireContiguous: false
  });

  assert.equal(result.feasible, false);
  assert.match(result.reason, /maksymalnie 2.00 kWh/);
  assert.deepEqual(result.slots, []);
});

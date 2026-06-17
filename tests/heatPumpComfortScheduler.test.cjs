const test = require('node:test');
const assert = require('node:assert/strict');
const { scheduleHeatPumpWithComfort } = require('../lib/heatPumpComfortScheduler.ts');

function request(overrides = {}) {
  return {
    initialIndoorTempC: 21,
    minimumComfortTempC: 20.5,
    targetEndTempC: 21,
    maximumPreheatTempC: 22,
    thermalCapacityKwhPerC: 5,
    heatLossKw: 1,
    cop: 3,
    maxElectricalPowerKw: 1,
    earliestStart: '00:00',
    latestEnd: '02:00',
    ...overrides
  };
}

test('preheats during the cheaper interval and keeps comfort', () => {
  const result = scheduleHeatPumpWithComfort([
    { start: '00:00', pricePerKwh: 0.1, durationMinutes: 60, date: '2026-06-18' },
    { start: '01:00', pricePerKwh: 1, durationMinutes: 60, date: '2026-06-18' }
  ], request());

  assert.equal(result.feasible, true);
  assert.ok(result.timeline[0].powerFraction > result.timeline[1].powerFraction);
  assert.ok(result.minimumProjectedTempC >= 20.5 - 1e-6);
  assert.ok(result.endTemperatureC >= 21 - 1e-6);
  assert.ok(result.totalCost < 0.4);
});

test('returns unfeasible when heating power cannot maintain comfort', () => {
  const result = scheduleHeatPumpWithComfort([
    { start: '00:00', pricePerKwh: 0.2, durationMinutes: 60 },
    { start: '01:00', pricePerKwh: 0.2, durationMinutes: 60 }
  ], request({
    initialIndoorTempC: 20.6,
    heatLossKw: 5,
    maxElectricalPowerKw: 0.5,
    cop: 2
  }));

  assert.equal(result.feasible, false);
  assert.match(result.reason, /utrzymać minimalnej temperatury/);
});

test('uses thermal mass to absorb energy during negative prices', () => {
  const result = scheduleHeatPumpWithComfort([
    { start: '00:00', pricePerKwh: -0.5, durationMinutes: 60 },
    { start: '01:00', pricePerKwh: 0.8, durationMinutes: 60 }
  ], request({ targetEndTempC: 20.5 }));

  assert.equal(result.feasible, true);
  assert.ok(result.timeline[0].powerFraction > 0);
  assert.ok(result.maximumProjectedTempC <= 22 + 1e-6);
  assert.ok(result.totalCost < 0);
});

test('supports a comfort window crossing midnight', () => {
  const result = scheduleHeatPumpWithComfort([
    { start: '23:00', pricePerKwh: 0.2, durationMinutes: 60, dayOffset: 0, date: '2026-06-18' },
    { start: '00:00', pricePerKwh: 0.3, durationMinutes: 60, dayOffset: 1, date: '2026-06-19' }
  ], request({ earliestStart: '23:00', latestEnd: '01:00' }));

  assert.equal(result.feasible, true);
  assert.equal(result.crossesMidnight, true);
  assert.equal(result.timeline[0].end, '24:00');
  assert.equal(result.timeline[1].startDate, '2026-06-19');
});

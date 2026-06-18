const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveExecutionEnergy } = require('../lib/deviceExecutionEnergy.ts');

test('prefers explicitly reported energy', () => {
  const result = resolveExecutionEnergy({
    reportedEnergyKwh: 1.4,
    meterStartKwh: 10,
    meterEndKwh: 12,
    powerKw: 2,
    durationHours: 1
  });

  assert.equal(result.valid, true);
  assert.equal(result.energyKwh, 1.4);
  assert.equal(result.source, 'reported');
  assert.equal(result.estimated, false);
});

test('uses meter delta when explicit energy is missing', () => {
  const result = resolveExecutionEnergy({
    meterStartKwh: 100.2,
    meterEndKwh: 101.7,
    durationHours: 2
  });

  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.energyKwh - 1.5) < 1e-9);
  assert.equal(result.source, 'meter_delta');
  assert.equal(result.estimated, false);
});

test('estimates energy from power and duration as a fallback', () => {
  const result = resolveExecutionEnergy({
    powerKw: 1.2,
    durationHours: 1.5
  });

  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.energyKwh - 1.8) < 1e-9);
  assert.equal(result.source, 'power_duration');
  assert.equal(result.estimated, true);
});

test('rejects execution without enough energy data', () => {
  const result = resolveExecutionEnergy({ durationHours: 1 });

  assert.equal(result.valid, false);
  assert.match(result.error, /energy_kwh/);
});

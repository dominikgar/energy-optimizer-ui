const test = require('node:test');
const assert = require('node:assert/strict');
const { scheduleBatteryArbitrage } = require('../lib/batteryArbitrageScheduler.ts');

function request(overrides = {}) {
  return {
    usableCapacityKwh: 10,
    initialSocPercent: 50,
    minimumSocPercent: 10,
    targetEndSocPercent: 50,
    maxChargePowerKw: 2,
    maxDischargePowerKw: 2,
    chargeEfficiencyPercent: 100,
    dischargeEfficiencyPercent: 100,
    batteryWearCostPerKwh: 0,
    allowGridCharging: true,
    allowExport: false,
    exportPriceFactor: 0.8,
    earliestStart: '00:00',
    latestEnd: '02:00',
    ...overrides
  };
}

test('charges at the low price and discharges against expensive household load', () => {
  const result = scheduleBatteryArbitrage([
    { start: '00:00', pricePerKwh: 0.1, durationMinutes: 60, householdLoadKw: 2, pvGenerationKw: 0 },
    { start: '01:00', pricePerKwh: 1, durationMinutes: 60, householdLoadKw: 2, pvGenerationKw: 0 }
  ], request());

  assert.equal(result.feasible, true);
  assert.equal(result.timeline[0].action, 'charge');
  assert.equal(result.timeline[1].action, 'discharge');
  assert.ok(result.savingsPln > 1.7);
  assert.ok(Math.abs(result.endSocPercent - 50) < 1e-6);
});

test('stores PV surplus when grid charging is disabled', () => {
  const result = scheduleBatteryArbitrage([
    { start: '12:00', pricePerKwh: 0.2, durationMinutes: 60, householdLoadKw: 0, pvGenerationKw: 2 },
    { start: '13:00', pricePerKwh: 1, durationMinutes: 60, householdLoadKw: 2, pvGenerationKw: 0 }
  ], request({
    initialSocPercent: 0,
    minimumSocPercent: 0,
    targetEndSocPercent: 0,
    allowGridCharging: false,
    earliestStart: '12:00',
    latestEnd: '14:00'
  }));

  assert.equal(result.feasible, true);
  assert.equal(result.timeline[0].action, 'charge');
  assert.equal(result.timeline[1].action, 'discharge');
  assert.ok(result.savingsPln > 1.9);
  assert.equal(result.totalGridImportKwh, 0);
});

test('does not cycle when battery wear exceeds the price spread', () => {
  const result = scheduleBatteryArbitrage([
    { start: '00:00', pricePerKwh: 0.1, durationMinutes: 60, householdLoadKw: 1, pvGenerationKw: 0 },
    { start: '01:00', pricePerKwh: 0.15, durationMinutes: 60, householdLoadKw: 1, pvGenerationKw: 0 }
  ], request({
    maxChargePowerKw: 1,
    maxDischargePowerKw: 1,
    batteryWearCostPerKwh: 0.1
  }));

  assert.equal(result.feasible, true);
  assert.deepEqual(result.activeSteps, []);
  assert.ok(Math.abs(result.savingsPln) < 1e-9);
});

test('respects the minimum state of charge', () => {
  const result = scheduleBatteryArbitrage([
    { start: '00:00', pricePerKwh: 2, durationMinutes: 60, householdLoadKw: 5, pvGenerationKw: 0 }
  ], request({
    initialSocPercent: 20,
    minimumSocPercent: 20,
    targetEndSocPercent: 20,
    earliestStart: '00:00',
    latestEnd: '01:00'
  }));

  assert.equal(result.feasible, true);
  assert.equal(result.timeline[0].action, 'idle');
  assert.equal(result.endSocPercent, 20);
});

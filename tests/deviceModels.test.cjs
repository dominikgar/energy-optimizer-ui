const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateBatteryChargeModel,
  calculateHeatPumpModel
} = require('../lib/deviceModels.ts');

test('converts thermal demand to electrical energy for a heat pump', () => {
  const result = calculateHeatPumpModel({
    thermalDemandKwh: 18,
    cop: 3,
    maxElectricalPowerKw: 3,
    reservePercent: 10
  });

  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.energyRequiredKwh - 6.6) < 1e-9);
  assert.equal(result.maxPowerKw, 3);
});

test('includes charging losses in the battery grid energy', () => {
  const result = calculateBatteryChargeModel({
    usableCapacityKwh: 10,
    currentSocPercent: 20,
    targetSocPercent: 80,
    maxChargePowerKw: 5,
    chargeEfficiencyPercent: 90
  });

  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.details.storedEnergyKwh - 6) < 1e-9);
  assert.ok(Math.abs(result.energyRequiredKwh - (6 / 0.9)) < 1e-9);
});

test('rejects a battery target below the current state of charge', () => {
  const result = calculateBatteryChargeModel({
    usableCapacityKwh: 10,
    currentSocPercent: 80,
    targetSocPercent: 50,
    maxChargePowerKw: 5,
    chargeEfficiencyPercent: 95
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /wyższy od aktualnego/);
});

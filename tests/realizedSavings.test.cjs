const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateRealizedSavings } = require('../lib/realizedSavings.ts');

test('calculates realized savings against a reference rate', () => {
  const result = calculateRealizedSavings({
    energyKwh: 10,
    averageMarketPricePlnKwh: 0.3,
    referenceRatePlnKwh: 0.8
  });

  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.actualMarketCostPln - 3) < 1e-9);
  assert.ok(Math.abs(result.referenceCostPln - 8) < 1e-9);
  assert.ok(Math.abs(result.savingsPln - 5) < 1e-9);
  assert.ok(Math.abs(result.savingsPercent - 62.5) < 1e-9);
});

test('allows a negative result when the executed cycle was more expensive', () => {
  const result = calculateRealizedSavings({
    energyKwh: 5,
    averageMarketPricePlnKwh: 1,
    referenceRatePlnKwh: 0.5
  });

  assert.equal(result.valid, true);
  assert.ok(result.savingsPln < 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  prepareAwaitingExecutionFinalization
} = require('../lib/deviceExecutionFinalizationModel.ts');

test('keeps execution awaiting when no prices are available', () => {
  assert.deepEqual(prepareAwaitingExecutionFinalization({
    energyKwh: 1.2,
    referenceRatePlnKwh: 0.8,
    averageMarketPricePlnKwh: null,
    sampleCount: 0
  }), { status: 'awaiting_prices' });
});

test('prepares an awaiting execution for finalization', () => {
  const result = prepareAwaitingExecutionFinalization({
    energyKwh: 2,
    referenceRatePlnKwh: 0.9,
    averageMarketPricePlnKwh: 0.4,
    sampleCount: 8
  });

  assert.equal(result.status, 'ready');
  assert.ok(Math.abs(result.actualMarketCostPln - 0.8) < 1e-9);
  assert.ok(Math.abs(result.referenceCostPln - 1.8) < 1e-9);
  assert.ok(Math.abs(result.savingsPln - 1) < 1e-9);
});

test('rejects invalid persisted execution data', () => {
  const result = prepareAwaitingExecutionFinalization({
    energyKwh: 0,
    referenceRatePlnKwh: 0.9,
    averageMarketPricePlnKwh: 0.4,
    sampleCount: 1
  });

  assert.equal(result.status, 'invalid');
  assert.match(result.error, /większa od zera/);
});

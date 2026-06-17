const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDynamicOfferCost } = require('../lib/costEngine.ts');

const baseConfig = {
  marketMultiplier: 1,
  marginPerKwh: 0,
  variableFeePerKwh: 0,
  monthlyFee: 0,
  vatPercent: 0,
  floorNegativeMarketPricesAtZero: false
};

test('passes negative market prices through when offer allows them', () => {
  const result = calculateDynamicOfferCost([
    { kwh: 1, marketPricePerKwh: -0.1 },
    { kwh: 1, marketPricePerKwh: 0.2 }
  ], baseConfig, 1);

  assert.equal(result.consumptionKwh, 2);
  assert.ok(Math.abs(result.totalCost - 0.1) < 1e-9);
});

test('floors negative market prices at zero when configured', () => {
  const result = calculateDynamicOfferCost([
    { kwh: 1, marketPricePerKwh: -0.1 },
    { kwh: 1, marketPricePerKwh: 0.2 }
  ], {
    ...baseConfig,
    floorNegativeMarketPricesAtZero: true
  }, 1);

  assert.ok(Math.abs(result.totalCost - 0.2) < 1e-9);
});

test('adds margin, variable fee, monthly fee and VAT separately', () => {
  const result = calculateDynamicOfferCost([
    { kwh: 2, marketPricePerKwh: 0.5 }
  ], {
    marketMultiplier: 1,
    marginPerKwh: 0.1,
    variableFeePerKwh: 0.05,
    monthlyFee: 30,
    vatPercent: 23,
    floorNegativeMarketPricesAtZero: false
  }, 365.2425 / 12);

  assert.ok(Math.abs(result.marketEnergyCost - 1) < 1e-9);
  assert.ok(Math.abs(result.marginCost - 0.2) < 1e-9);
  assert.ok(Math.abs(result.variableFeeCost - 0.1) < 1e-9);
  assert.ok(Math.abs(result.proratedMonthlyFee - 30) < 1e-9);
  assert.ok(Math.abs(result.vatCost - 7.199) < 1e-9);
  assert.ok(Math.abs(result.totalCost - 38.499) < 1e-9);
});

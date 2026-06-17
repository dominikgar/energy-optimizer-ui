const test = require('node:test');
const assert = require('node:assert/strict');
const { hasProAccess, hasStalePeriodMetadata } = require('../lib/proAccess.ts');

test('grants PRO access when is_active is true even if period metadata is stale', () => {
  const subscription = {
    is_active: true,
    current_period_end: '2025-01-01T00:00:00.000Z'
  };

  assert.equal(hasProAccess(subscription), true);
  assert.equal(hasStalePeriodMetadata(subscription, new Date('2026-06-17T00:00:00.000Z')), true);
});

test('denies PRO access when is_active is false', () => {
  assert.equal(hasProAccess({ is_active: false, current_period_end: '2099-01-01T00:00:00.000Z' }), false);
});

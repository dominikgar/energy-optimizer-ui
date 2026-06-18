const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWaitingForPricesPayload } = require('../lib/waitingForPrices.ts');

test('returns a safe waiting state for an overnight plan', () => {
  const payload = buildWaitingForPricesPayload({
    generatedAt: new Date('2026-06-18T06:00:00.000Z'),
    timezone: 'Europe/Warsaw',
    baseDate: '2026-06-18',
    windowEndDate: '2026-06-19',
    day: 'today',
    deviceName: 'dishwasher',
    currentDate: '2026-06-18',
    currentTime: '08:00',
    missingPriceDates: ['2026-06-19'],
    overnight: true,
    request: {}
  });

  assert.equal(payload.status, 'waiting_for_prices');
  assert.equal(payload.trigger_automation, false);
  assert.equal(payload.waiting_for_prices, true);
  assert.deepEqual(payload.missing_price_dates, ['2026-06-19']);
  assert.equal(payload.retry_after_seconds, 300);
  assert.equal(payload.retry_after, '2026-06-18T06:05:00.000Z');
  assert.equal(payload.valid_until, payload.retry_after);
  assert.equal(payload.schedule.status, 'pending');
  assert.equal(payload.schedule.feasible, null);
  assert.deepEqual(payload.schedule.slots, []);
  assert.match(payload.recommendation_reason, /okno nocne/);
});

test('removes duplicate missing dates', () => {
  const payload = buildWaitingForPricesPayload({
    generatedAt: new Date('2026-06-18T06:00:00.000Z'),
    timezone: 'Europe/Warsaw',
    baseDate: '2026-06-18',
    windowEndDate: '2026-06-19',
    day: 'tomorrow',
    deviceName: 'ev_charger',
    currentDate: '2026-06-18',
    currentTime: '08:00',
    missingPriceDates: ['2026-06-18', '2026-06-19', '2026-06-19'],
    overnight: true,
    request: {}
  });

  assert.deepEqual(payload.missing_price_dates, ['2026-06-18', '2026-06-19']);
});

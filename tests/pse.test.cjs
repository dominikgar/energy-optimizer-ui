const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePseDayRows } = require('../lib/pse.ts');

function formatTime(minutes) {
  const normalized = minutes % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function createQuarterHourRows(date) {
  return Array.from({ length: 96 }, (_, index) => {
    const startMinutes = index * 15;
    const endMinutes = startMinutes + 15;
    const lowWindow = index >= 4 && index < 16;
    return {
      business_date: date,
      period: `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`,
      dtime: `${date} ${formatTime(endMinutes)}:00`,
      rce_pln: lowWindow ? -100 : 1000
    };
  });
}

test('uses period start instead of dtime end for 15-minute PSE intervals', () => {
  const forecast = parsePseDayRows(createQuarterHourRows('2026-06-17'), '2026-06-17');

  assert.ok(forecast);
  assert.equal(forecast.intervalMinutes, 15);
  assert.equal(forecast.prices[0].time, '00:00');
  assert.equal(forecast.prices[1].time, '00:15');
  assert.equal(forecast.bestWindowStart, '01:00');
  assert.equal(forecast.bestWindowEnd, '04:00');
  assert.equal(forecast.minimumPrice, -0.1);
});

test('ignores rows from a different business date', () => {
  const forecast = parsePseDayRows(createQuarterHourRows('2026-06-16'), '2026-06-17');
  assert.equal(forecast, null);
});

test('returns null when there are too few intervals for requested window', () => {
  const rows = [
    { business_date: '2026-06-17', period: '00:00 - 01:00', rce_pln: 100 },
    { business_date: '2026-06-17', period: '01:00 - 02:00', rce_pln: 200 }
  ];
  assert.equal(parsePseDayRows(rows, '2026-06-17', 3), null);
});

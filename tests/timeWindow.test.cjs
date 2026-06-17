const test = require('node:test');
const assert = require('node:assert/strict');
const { isTimeInsideWindow } = require('../lib/timeWindow.ts');

test('checks a normal same-day window', () => {
  assert.equal(isTimeInsideWindow('13:30', '13:00', '14:00'), true);
  assert.equal(isTimeInsideWindow('14:00', '13:00', '14:00'), false);
});

test('checks a window crossing midnight', () => {
  assert.equal(isTimeInsideWindow('23:30', '22:00', '02:00'), true);
  assert.equal(isTimeInsideWindow('01:30', '22:00', '02:00'), true);
  assert.equal(isTimeInsideWindow('12:00', '22:00', '02:00'), false);
});

test('supports an end boundary of 24:00', () => {
  assert.equal(isTimeInsideWindow('23:59', '23:00', '24:00'), true);
  assert.equal(isTimeInsideWindow('00:00', '23:00', '24:00'), false);
});

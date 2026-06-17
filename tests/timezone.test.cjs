const test = require('node:test');
const assert = require('node:assert/strict');
const { formatWarsawTime, getWarsawHour } = require('../lib/timezone.ts');

test('handles spring DST jump in Europe/Warsaw', () => {
  const beforeJump = new Date('2026-03-29T00:30:00Z');
  const afterJump = new Date('2026-03-29T01:30:00Z');

  assert.equal(formatWarsawTime(beforeJump), '01:30');
  assert.equal(formatWarsawTime(afterJump), '03:30');
  assert.equal(getWarsawHour(afterJump), 3);
});

test('keeps both autumn repeated hours as distinct instants', () => {
  const summerOffsetInstance = new Date('2026-10-25T00:30:00Z');
  const winterOffsetInstance = new Date('2026-10-25T01:30:00Z');

  assert.equal(formatWarsawTime(summerOffsetInstance), '02:30');
  assert.equal(formatWarsawTime(winterOffsetInstance), '02:30');
  assert.notEqual(summerOffsetInstance.getTime(), winterOffsetInstance.getTime());
});

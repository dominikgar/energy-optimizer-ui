const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_MAX_RUNNING_HOURS,
  executionAgeHours,
  isStaleRunningExecution,
  resolveMaxRunningHours
} = require('../lib/deviceExecutionLifecycle.ts');

test('uses a safe default and bounds the running timeout', () => {
  assert.equal(resolveMaxRunningHours(undefined), DEFAULT_MAX_RUNNING_HOURS);
  assert.equal(resolveMaxRunningHours('12'), 12);
  assert.equal(resolveMaxRunningHours(0), 1);
  assert.equal(resolveMaxRunningHours(9999), 720);
});

test('calculates execution age in hours', () => {
  assert.equal(
    executionAgeHours('2026-06-17T10:00:00Z', '2026-06-17T12:30:00Z'),
    2.5
  );
  assert.equal(executionAgeHours('invalid', '2026-06-17T12:30:00Z'), null);
});

test('marks only executions older than the configured timeout as stale', () => {
  const now = '2026-06-19T12:00:00Z';
  assert.equal(isStaleRunningExecution('2026-06-17T11:59:59Z', now, 48), true);
  assert.equal(isStaleRunningExecution('2026-06-18T12:01:00Z', now, 48), false);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decideStartCollision,
  decideStopTransition,
  decideCancelTransition
} = require('../lib/deviceExecutionTransitions.ts');

test('duplicate start returns the existing running execution', () => {
  assert.equal(decideStartCollision('running'), 'return_existing');
  assert.equal(decideStartCollision('completed'), 'conflict');
});

test('repeated stop returns the completed result', () => {
  assert.equal(decideStopTransition('completed'), 'return_completed');
  assert.equal(decideStopTransition('running'), 'process');
  assert.equal(decideStopTransition('awaiting_prices'), 'process');
  assert.equal(decideStopTransition('cancelled'), 'reject_cancelled');
});

test('repeated cancel is idempotent and completed cycles are protected', () => {
  assert.equal(decideCancelTransition('cancelled'), 'return_cancelled');
  assert.equal(decideCancelTransition('running'), 'cancel');
  assert.equal(decideCancelTransition('awaiting_prices'), 'cancel');
  assert.equal(decideCancelTransition('completed'), 'reject_completed');
});

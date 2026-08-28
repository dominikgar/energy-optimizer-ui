const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitizeEventMetadata,
  eventFingerprint,
  shouldRecordAppEvent
} = require('../lib/appEvents.ts');

test('sanitizes sensitive values recursively', () => {
  const metadata = sanitizeEventMetadata({
    authorization: 'Bearer abc',
    nested: {
      api_key: 'secret-key',
      safe: 'visible'
    },
    access_token: 'token-value'
  });

  assert.equal(metadata.authorization, '[redacted]');
  assert.equal(metadata.access_token, '[redacted]');
  assert.equal(metadata.nested.api_key, '[redacted]');
  assert.equal(metadata.nested.safe, 'visible');
});

test('serializes Error without a stack trace', () => {
  const metadata = sanitizeEventMetadata({ error: new Error('database failed') });

  assert.deepEqual(metadata.error, {
    name: 'Error',
    message: 'database failed'
  });
});

test('creates stable event fingerprints', () => {
  const first = eventFingerprint('pse', 'request.failed', 'timeout');
  const second = eventFingerprint('pse', 'request.failed', 'timeout');
  const different = eventFingerprint('pse', 'request.failed', 'http 500');

  assert.equal(first, second);
  assert.notEqual(first, different);
  assert.equal(first.length, 32);
});

test('suppresses repeated error events for five minutes', () => {
  const fingerprint = `test-${Date.now()}-${Math.random()}`;
  assert.equal(shouldRecordAppEvent(fingerprint, 'error', 10_000), true);
  assert.equal(shouldRecordAppEvent(fingerprint, 'error', 10_000 + (5 * 60 * 1000) - 1), false);
  assert.equal(shouldRecordAppEvent(fingerprint, 'error', 10_000 + (5 * 60 * 1000)), true);
});

test('does not suppress distinct non-error events', () => {
  const fingerprint = `test-warning-${Date.now()}-${Math.random()}`;
  assert.equal(shouldRecordAppEvent(fingerprint, 'warning', 10_000), true);
  assert.equal(shouldRecordAppEvent(fingerprint, 'warning', 10_001), true);
});

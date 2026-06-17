const test = require('node:test');
const assert = require('node:assert/strict');
const {
  accessTokenPrefix,
  consumeAccessTokenRateLimit,
  digestAccessToken,
  generateAccessToken
} = require('../lib/accessTokens.ts');

test('generates a long random token and stores only a stable digest', () => {
  const first = generateAccessToken();
  const second = generateAccessToken();

  assert.match(first, /^eo_live_[0-9a-f]{64}$/);
  assert.notEqual(first, second);
  assert.equal(digestAccessToken(first), digestAccessToken(first));
  assert.notEqual(digestAccessToken(first), digestAccessToken(second));
  assert.equal(digestAccessToken(first).length, 64);
});

test('creates a non-secret display prefix', () => {
  const token = 'eo_live_1234567890abcdef';
  assert.equal(accessTokenPrefix(token), 'eo_live_12345678…');
});

test('limits a token to 120 requests in a five-minute local window', () => {
  const digest = `test-${Date.now()}-${Math.random()}`;
  for (let index = 0; index < 120; index++) {
    assert.equal(consumeAccessTokenRateLimit(digest, 1000).allowed, true);
  }
  assert.equal(consumeAccessTokenRateLimit(digest, 1000).allowed, false);
  assert.equal(consumeAccessTokenRateLimit(digest, 301001).allowed, true);
});

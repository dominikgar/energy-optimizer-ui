const test = require('node:test');
const assert = require('node:assert/strict');
const { createAsyncCache } = require('../lib/asyncCache.ts');

const policy = {
  ttlMs: 1000,
  emptyTtlMs: 100,
  staleMs: 5000,
  retryTtlMs: 50,
  isEmpty: (value) => value === null
};

test('reuses a cached value until TTL expires', async () => {
  let now = 0;
  let calls = 0;
  const cache = createAsyncCache(() => now);
  const loader = async () => ++calls;

  assert.equal(await cache.get('day', loader, { ...policy, isEmpty: () => false }), 1);
  now = 999;
  assert.equal(await cache.get('day', loader, { ...policy, isEmpty: () => false }), 1);
  now = 1000;
  assert.equal(await cache.get('day', loader, { ...policy, isEmpty: () => false }), 2);
});

test('deduplicates concurrent requests for the same key', async () => {
  let resolveLoader;
  let calls = 0;
  const cache = createAsyncCache(() => 0);
  const loader = () => {
    calls++;
    return new Promise((resolve) => { resolveLoader = resolve; });
  };

  const first = cache.get('day', loader, policy);
  const second = cache.get('day', loader, policy);
  assert.equal(calls, 1);
  resolveLoader('ready');
  assert.equal(await first, 'ready');
  assert.equal(await second, 'ready');
});

test('keeps the last good value when refresh temporarily returns empty', async () => {
  let now = 0;
  const cache = createAsyncCache(() => now);
  assert.equal(await cache.get('day', async () => 'prices', policy), 'prices');
  now = 1001;
  assert.equal(await cache.get('day', async () => null, policy), 'prices');
});

test('keeps the last good value when refresh throws inside stale window', async () => {
  let now = 0;
  const cache = createAsyncCache(() => now);
  assert.equal(await cache.get('day', async () => 'prices', policy), 'prices');
  now = 1001;
  assert.equal(await cache.get('day', async () => { throw new Error('PSE offline'); }, policy), 'prices');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createFaviconResponse } = require('../lib/favicon.ts');

test('builds a cacheable favicon response without rendering the Clerk-backed root layout', async () => {
  const response = createFaviconResponse();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/svg+xml; charset=utf-8');
  assert.match(response.headers.get('cache-control'), /immutable/);
  assert.match(await response.text(), /<svg/);
});

test('routes favicon.ico through middleware before Clerk protection', () => {
  const middleware = fs.readFileSync(path.join(__dirname, '..', 'middleware.ts'), 'utf8');

  assert.match(middleware, /pathname === '\/favicon\.ico'/);
  assert.match(middleware, /'\/favicon\.ico'/);
  assert.match(middleware, /return createFaviconResponse\(\)/);
});

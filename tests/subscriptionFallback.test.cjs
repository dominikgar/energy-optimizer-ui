const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'app', 'page.tsx'), 'utf8');

test('does not present the PRO purchase flow when subscription verification fails', () => {
  assert.ok(page.includes('subscriptionVerificationUnavailable'));
  assert.ok(page.includes('Nie można chwilowo zweryfikować dostępu PRO'));
  assert.ok(page.includes('nie kupuj dostępu ponownie'));
});

test('keeps subscription verification independent from the tariff lookup', () => {
  assert.ok(page.includes('Subscription verification error:'));
  assert.ok(page.includes('Tariff query error:'));
  assert.equal(page.includes('const [subscriptionResult, tariffResult] = await Promise.all(['), false);
});

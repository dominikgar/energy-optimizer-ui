const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('management index page exists and checks access', () => {
  const page = readText('app/admin/page.tsx');
  assert.ok(page.includes('isAdminUser'));
  assert.ok(page.includes('notFound'));
  assert.ok(page.includes('AdminPanels'));
});

test('management panels component lists known views', () => {
  const component = readText('app/admin/AdminPanels.tsx');
  for (const href of ['/admin/diagnostics', '/savings', '/dashboardy']) {
    assert.ok(component.includes(href), href);
  }
  assert.ok(component.includes('Panele EnergyOptimizer'));
});

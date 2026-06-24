const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const integrationDir = path.join(root, 'custom_components', 'energy_optimizer');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

test('HACS integration has required repository structure', () => {
  for (const relativePath of [
    'hacs.json',
    'custom_components/energy_optimizer/__init__.py',
    'custom_components/energy_optimizer/api.py',
    'custom_components/energy_optimizer/binary_sensor.py',
    'custom_components/energy_optimizer/config_flow.py',
    'custom_components/energy_optimizer/const.py',
    'custom_components/energy_optimizer/coordinator.py',
    'custom_components/energy_optimizer/diagnostics.py',
    'custom_components/energy_optimizer/manifest.json',
    'custom_components/energy_optimizer/sensor.py',
    'custom_components/energy_optimizer/strings.json',
    'custom_components/energy_optimizer/translations/en.json',
    'custom_components/energy_optimizer/translations/pl.json',
    'docs/hacs-mvp.md'
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, relativePath);
  }
  assert.equal(fs.existsSync(path.join(root, 'tmp.txt')), false);
  assert.equal(fs.existsSync(path.join(integrationDir, 'test.txt')), false);
});

test('manifest contains required Home Assistant and HACS metadata', () => {
  const manifest = readJson('custom_components/energy_optimizer/manifest.json');
  assert.equal(manifest.domain, 'energy_optimizer');
  assert.equal(manifest.name, 'EnergyOptimizer');
  assert.equal(manifest.config_flow, true);
  assert.equal(manifest.integration_type, 'hub');
  assert.equal(manifest.iot_class, 'cloud_polling');
  assert.equal(manifest.version, '0.1.0');
  assert.deepEqual(manifest.requirements, []);
  assert.ok(manifest.documentation.includes('docs/hacs-mvp.md'));
  assert.ok(manifest.issue_tracker.includes('energy-optimizer-ui/issues'));
  assert.ok(manifest.codeowners.includes('@dominikgar'));
});

test('HACS metadata points to sensor platforms', () => {
  const hacs = readJson('hacs.json');
  assert.equal(hacs.name, 'EnergyOptimizer');
  assert.deepEqual(hacs.domains, ['sensor', 'binary_sensor']);
  assert.equal(hacs.render_readme, true);
});

test('translations are valid JSON and expose config flow labels', () => {
  for (const relativePath of [
    'custom_components/energy_optimizer/strings.json',
    'custom_components/energy_optimizer/translations/en.json',
    'custom_components/energy_optimizer/translations/pl.json'
  ]) {
    const data = readJson(relativePath);
    assert.equal(typeof data.config.step.user.data.api_token, 'string', relativePath);
    assert.equal(typeof data.entity.sensor.schedule_status.name, 'string', relativePath);
    assert.equal(typeof data.entity.binary_sensor.trigger_automation.name, 'string', relativePath);
  }
});

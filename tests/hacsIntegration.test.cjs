const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const integrationDir = path.join(root, 'custom_components', 'energy_optimizer');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
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
    'custom_components/energy_optimizer/services.py',
    'custom_components/energy_optimizer/services.yaml',
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

test('Home Assistant Python files compile', () => {
  const python = process.env.PYTHON || 'python3';
  const files = fs.readdirSync(integrationDir)
    .filter((file) => file.endsWith('.py'))
    .map((file) => path.join(integrationDir, file));
  execFileSync(python, ['-m', 'py_compile', ...files], { stdio: 'pipe' });
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

test('translations are valid JSON and expose config and option flow labels', () => {
  for (const relativePath of [
    'custom_components/energy_optimizer/strings.json',
    'custom_components/energy_optimizer/translations/en.json',
    'custom_components/energy_optimizer/translations/pl.json'
  ]) {
    const data = readJson(relativePath);
    assert.equal(typeof data.config.step.user.data.api_token, 'string', relativePath);
    assert.equal(typeof data.options.step.init.data.device_name, 'string', relativePath);
    assert.equal(typeof data.options.error.invalid_time_window, 'string', relativePath);
    assert.equal(typeof data.entity.sensor.schedule_status.name, 'string', relativePath);
    assert.equal(typeof data.entity.binary_sensor.trigger_automation.name, 'string', relativePath);
  }
});

test('option flow is registered and reloads integration on option changes', () => {
  const init = readText('custom_components/energy_optimizer/__init__.py');
  const configFlow = readText('custom_components/energy_optimizer/config_flow.py');
  const docs = readText('docs/hacs-mvp.md');

  assert.ok(configFlow.includes('async_get_options_flow'));
  assert.ok(configFlow.includes('EnergyOptimizerOptionsFlowHandler'));
  assert.ok(configFlow.includes('async_step_init'));
  assert.ok(configFlow.includes('return EnergyOptimizerOptionsFlowHandler()'));
  assert.equal(configFlow.includes('self.config_entry = config_entry'), false);
  assert.ok(configFlow.includes('CONF_DEVICE_NAME'));
  assert.ok(configFlow.includes('CONF_ENERGY_KWH'));
  assert.ok(configFlow.includes('CONF_POWER_KW'));
  assert.ok(configFlow.includes('CONF_EARLIEST_START'));
  assert.ok(configFlow.includes('CONF_LATEST_END'));
  assert.ok(configFlow.includes('CONF_CONTIGUOUS'));
  assert.ok(init.includes('entry.options'));
  assert.ok(init.includes('add_update_listener'));
  assert.ok(init.includes('async_reload'));
  assert.ok(docs.includes('## Opcje integracji'));
});

test('execution services are registered and documented', () => {
  const init = readText('custom_components/energy_optimizer/__init__.py');
  const constants = readText('custom_components/energy_optimizer/const.py');
  const services = readText('custom_components/energy_optimizer/services.py');
  const servicesYaml = readText('custom_components/energy_optimizer/services.yaml');
  const docs = readText('docs/hacs-mvp.md');

  for (const service of ['start_execution', 'stop_execution', 'cancel_execution']) {
    assert.ok(services.includes(service), service);
    assert.ok(servicesYaml.includes(`${service}:`), service);
    assert.ok(docs.includes(`energy_optimizer.${service}`), service);
  }

  assert.ok(init.includes('async_setup_services'));
  assert.ok(init.includes('async_unload_services'));
  assert.ok(services.includes('EVENT_EXECUTION_SERVICE'));
  assert.ok(constants.includes('energy_optimizer_execution_service'));
  assert.ok(services.includes('async_request_refresh'));
});

test('execution client sends API-compatible payload fields', () => {
  const api = readText('custom_components/energy_optimizer/api.py');
  for (const field of [
    'reference_rate_pln_kwh',
    'meter_start_kwh',
    'meter_end_kwh',
    'energy_kwh',
    'execution_id',
    'device_name',
    'home_assistant_hacs'
  ]) {
    assert.ok(api.includes(field), field);
  }
});

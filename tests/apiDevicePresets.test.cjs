const test = require('node:test');
const assert = require('node:assert/strict');
const {
  API_DEVICE_PRESETS,
  EXECUTION_REPORTING_DEFAULTS,
  buildHomeAssistantExecutionYaml,
  buildHomeAssistantYaml,
  buildScheduleCurl
} = require('../lib/apiDevicePresets.ts');

test('EV preset generates an overnight interruptible schedule', () => {
  const yaml = buildHomeAssistantYaml('secret', API_DEVICE_PRESETS.ev);

  assert.match(yaml, /https:\/\/www\.energyoptimizer\.pl\/api\/v1\/schedule\/device\?/);
  assert.match(yaml, /device_name=ev_charger/);
  assert.match(yaml, /energy_kwh=20/);
  assert.match(yaml, /power_kw=7\.4/);
  assert.match(yaml, /earliest_start=22%3A00/);
  assert.match(yaml, /latest_end=06%3A00/);
  assert.match(yaml, /contiguous=false/);
  assert.match(yaml, /EO EV Should Run/);
  assert.match(yaml, /EO EV Schedule/);
});

test('Home Assistant YAML uses a valid REST structure', () => {
  const yaml = buildHomeAssistantYaml('secret', API_DEVICE_PRESETS.dishwasher);

  assert.doesNotMatch(yaml, /\n\s+params:/);
  assert.match(yaml, /binary_sensor:/);
  assert.match(yaml, /availability:/);
  assert.match(yaml, /sensor:/);
  assert.match(yaml, /json_attributes:/);
  assert.match(yaml, /- error/);
  assert.match(yaml, /- schedule/);
  assert.match(yaml, /Authorization: "Bearer secret"/);
});

test('Home Assistant YAML keeps sensors available while waiting for PSE prices', () => {
  const yaml = buildHomeAssistantYaml('secret', API_DEVICE_PRESETS.dishwasher);

  assert.match(yaml, /waiting_for_prices/);
  assert.match(yaml, /Oczekiwanie na ceny PSE/);
  assert.match(yaml, /- missing_price_dates/);
  assert.match(yaml, /- retry_after/);
  assert.match(yaml, /- retry_after_seconds/);
  assert.match(yaml, /value_json\.status in \['success', 'unfeasible', 'waiting_for_prices'\]/);
});

test('meter execution reporting uses start and end meter readings', () => {
  const yaml = buildHomeAssistantExecutionYaml(
    'secret',
    API_DEVICE_PRESETS.dishwasher,
    EXECUTION_REPORTING_DEFAULTS.dishwasher
  );

  assert.match(yaml, /api\/v1\/savings\/execution/);
  assert.match(yaml, /Authorization: "Bearer secret"/);
  assert.match(yaml, /"action": "start"/);
  assert.match(yaml, /"action": "stop"/);
  assert.match(yaml, /meter_start_kwh/);
  assert.match(yaml, /meter_end_kwh/);
  assert.match(yaml, /sensor\.dishwasher_energy_total/);
  assert.match(yaml, /entity_id: switch\.dishwasher/);
  assert.match(yaml, /service: rest_command\.eo_dishwasher_execution_start/);
  assert.match(yaml, /for: "00:01:00"/);
});

test('estimated execution reporting uses configured power without meter fields', () => {
  const yaml = buildHomeAssistantExecutionYaml(
    'secret',
    API_DEVICE_PRESETS.custom,
    EXECUTION_REPORTING_DEFAULTS.custom
  );

  assert.match(yaml, /"power_kw": 2/);
  assert.doesNotMatch(yaml, /meter_start_kwh/);
  assert.doesNotMatch(yaml, /meter_end_kwh/);
  assert.match(yaml, /reference_rate_pln_kwh/);
});

test('custom config is reflected in cURL and YAML', () => {
  const config = {
    ...API_DEVICE_PRESETS.custom,
    day: 'tomorrow',
    deviceName: 'garden_pump',
    sensorName: 'EO Garden Pump',
    energyKwh: 3.5,
    powerKw: 1.2,
    earliestStart: '10:00',
    latestEnd: '15:00',
    contiguous: true
  };

  const curl = buildScheduleCurl('token-123', config);
  const yaml = buildHomeAssistantYaml('token-123', config);

  assert.match(curl, /https:\/\/www\.energyoptimizer\.pl/);
  assert.match(curl, /day=tomorrow/);
  assert.match(curl, /device_name=garden_pump/);
  assert.match(yaml, /day=tomorrow/);
  assert.match(yaml, /unique_id: garden_pump_should_run/);
  assert.match(yaml, /unique_id: garden_pump_schedule/);
  assert.match(yaml, /name: "EO Garden Pump"/);
  assert.match(yaml, /name: "EO Garden Pump Schedule"/);
});

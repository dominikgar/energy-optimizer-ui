const test = require('node:test');
const assert = require('node:assert/strict');
const {
  API_DEVICE_PRESETS,
  buildHomeAssistantYaml,
  buildScheduleCurl
} = require('../lib/apiDevicePresets.ts');

test('EV preset generates an overnight interruptible schedule', () => {
  const yaml = buildHomeAssistantYaml('secret', API_DEVICE_PRESETS.ev);

  assert.match(yaml, /device_name: ev_charger/);
  assert.match(yaml, /energy_kwh: 20/);
  assert.match(yaml, /power_kw: 7.4/);
  assert.match(yaml, /earliest_start: "22:00"/);
  assert.match(yaml, /latest_end: "06:00"/);
  assert.match(yaml, /contiguous: false/);
  assert.match(yaml, /EO EV Should Run/);
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

  assert.match(curl, /day=tomorrow/);
  assert.match(curl, /device_name=garden_pump/);
  assert.match(yaml, /day: tomorrow/);
  assert.match(yaml, /unique_id: garden_pump_should_run/);
  assert.match(yaml, /name: "EO Garden Pump"/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildHomeAssistantSavingsSummaryYaml
} = require('../lib/homeAssistantSavingsSummary.ts');

test('generates compact Home Assistant savings sensors', () => {
  const yaml = buildHomeAssistantSavingsSummaryYaml('secret', 900);

  assert.match(yaml, /api\/v1\/savings\/summary/);
  assert.match(yaml, /Authorization: "Bearer secret"/);
  assert.match(yaml, /scan_interval: 900/);
  assert.match(yaml, /unique_id: eo_savings_total/);
  assert.match(yaml, /unique_id: eo_savings_this_month/);
  assert.match(yaml, /unique_id: eo_shifted_energy_total/);
  assert.match(yaml, /unique_id: eo_last_cycle_device/);
  assert.match(yaml, /unique_id: eo_execution_active/);
  assert.match(yaml, /device_class: monetary/);
  assert.match(yaml, /device_class: energy/);
  assert.doesNotMatch(yaml, /json_attributes:/);
});

test('returns a list item intended for the existing rest section', () => {
  const yaml = buildHomeAssistantSavingsSummaryYaml('secret');

  assert.match(yaml, /pod istniejącą sekcją rest:/);
  assert.doesNotMatch(yaml, /^rest:/m);
  assert.match(yaml, /^  - resource:/m);
});

test('clamps the polling interval to a safe range', () => {
  assert.match(buildHomeAssistantSavingsSummaryYaml('secret', 10), /scan_interval: 300/);
  assert.match(buildHomeAssistantSavingsSummaryYaml('secret', 100000), /scan_interval: 86400/);
});

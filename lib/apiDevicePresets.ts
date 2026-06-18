export type ApiDevicePresetId = 'boiler' | 'ev' | 'dishwasher' | 'custom';
export type ApiScheduleDay = 'today' | 'tomorrow';
export type ExecutionReportingMode = 'meter' | 'estimated';

export interface ApiDeviceConfig {
  id: ApiDevicePresetId;
  label: string;
  day: ApiScheduleDay;
  deviceName: string;
  sensorName: string;
  energyKwh: number;
  powerKw: number;
  earliestStart: string;
  latestEnd: string;
  contiguous: boolean;
}

export interface ExecutionReportingConfig {
  mode: ExecutionReportingMode;
  referenceRatePlnKwh: number;
  triggerEntityId: string;
  meterEntityId: string;
  stopDelaySeconds: number;
}

export const API_DEVICE_PRESETS: Record<ApiDevicePresetId, ApiDeviceConfig> = {
  boiler: {
    id: 'boiler',
    label: 'Bojler',
    day: 'today',
    deviceName: 'boiler',
    sensorName: 'EO Boiler Should Run',
    energyKwh: 6,
    powerKw: 2,
    earliestStart: '22:00',
    latestEnd: '07:00',
    contiguous: true
  },
  ev: {
    id: 'ev',
    label: 'Samochód elektryczny',
    day: 'today',
    deviceName: 'ev_charger',
    sensorName: 'EO EV Should Run',
    energyKwh: 20,
    powerKw: 7.4,
    earliestStart: '22:00',
    latestEnd: '06:00',
    contiguous: false
  },
  dishwasher: {
    id: 'dishwasher',
    label: 'Zmywarka / pralka',
    day: 'today',
    deviceName: 'dishwasher',
    sensorName: 'EO Dishwasher Should Run',
    energyKwh: 1.5,
    powerKw: 1,
    earliestStart: '18:00',
    latestEnd: '07:00',
    contiguous: true
  },
  custom: {
    id: 'custom',
    label: 'Urządzenie własne',
    day: 'today',
    deviceName: 'custom_device',
    sensorName: 'EO Custom Device Should Run',
    energyKwh: 5,
    powerKw: 2,
    earliestStart: '00:00',
    latestEnd: '24:00',
    contiguous: true
  }
};

export const EXECUTION_REPORTING_DEFAULTS: Record<ApiDevicePresetId, ExecutionReportingConfig> = {
  boiler: {
    mode: 'meter',
    referenceRatePlnKwh: 0.85,
    triggerEntityId: 'switch.boiler',
    meterEntityId: 'sensor.boiler_energy_total',
    stopDelaySeconds: 60
  },
  ev: {
    mode: 'meter',
    referenceRatePlnKwh: 0.85,
    triggerEntityId: 'switch.ev_charger',
    meterEntityId: 'sensor.ev_charger_energy_total',
    stopDelaySeconds: 60
  },
  dishwasher: {
    mode: 'meter',
    referenceRatePlnKwh: 0.85,
    triggerEntityId: 'switch.dishwasher',
    meterEntityId: 'sensor.dishwasher_energy_total',
    stopDelaySeconds: 60
  },
  custom: {
    mode: 'estimated',
    referenceRatePlnKwh: 0.85,
    triggerEntityId: 'switch.custom_device',
    meterEntityId: 'sensor.custom_device_energy_total',
    stopDelaySeconds: 60
  }
};

const SCHEDULE_URL = 'https://www.energyoptimizer.pl/api/v1/schedule/device';
const EXECUTION_URL = 'https://www.energyoptimizer.pl/api/v1/savings/execution';

function buildQuery(config: ApiDeviceConfig): string {
  const params = new URLSearchParams({
    day: config.day,
    device_name: config.deviceName,
    energy_kwh: String(config.energyKwh),
    power_kw: String(config.powerKw),
    earliest_start: config.earliestStart,
    latest_end: config.latestEnd,
    contiguous: String(config.contiguous)
  });
  return params.toString();
}

function scheduleSensorName(sensorName: string): string {
  return sensorName.includes('Should Run')
    ? sensorName.replace('Should Run', 'Schedule')
    : `${sensorName} Schedule`;
}

function normalizeEntityId(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '_');
  return normalized.includes('.') ? normalized : fallback;
}

function durationFromSeconds(seconds: number): string {
  const safe = Math.max(0, Math.min(86400, Math.round(Number(seconds) || 0)));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function buildScheduleCurl(token: string, config: ApiDeviceConfig): string {
  return `curl -i \\
  -H "Authorization: Bearer ${token}" \\
  -H "Accept: application/json" \\
  "${SCHEDULE_URL}?${buildQuery(config)}"`;
}

export function buildHomeAssistantYaml(token: string, config: ApiDeviceConfig): string {
  const url = `${SCHEDULE_URL}?${buildQuery(config)}`;
  const detailsName = scheduleSensorName(config.sensorName);
  const detailsId = `${config.deviceName}_schedule`;

  return `rest:
  - resource: >-
      ${url}
    method: GET
    headers:
      Authorization: "Bearer ${token}"
      Accept: "application/json"
    scan_interval: 300
    timeout: 20

    binary_sensor:
      - name: "${config.sensorName}"
        unique_id: ${config.deviceName}_should_run
        availability: >-
          {{ value_json.status in ['success', 'unfeasible', 'waiting_for_prices'] }}
        value_template: >-
          {{ value_json.trigger_automation | default(false) | bool }}

    sensor:
      - name: "${detailsName}"
        unique_id: ${detailsId}
        value_template: >-
          {% if value_json.error is defined %}
            Błąd API
          {% elif value_json.status == 'waiting_for_prices' %}
            Oczekiwanie na ceny PSE
          {% else %}
            {{ value_json.recommendation_reason | default('Brak rekomendacji') }}
          {% endif %}
        json_attributes:
          - status
          - error
          - recommendation_reason
          - active_slot
          - schedule
          - valid_until
          - waiting_for_prices
          - missing_price_dates
          - retry_after
          - retry_after_seconds
          - device_name
          - generated_at`;
}

export function buildHomeAssistantExecutionYaml(
  token: string,
  config: ApiDeviceConfig,
  reporting: ExecutionReportingConfig
): string {
  const deviceName = config.deviceName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const triggerEntityId = normalizeEntityId(reporting.triggerEntityId, `switch.${deviceName}`);
  const meterEntityId = normalizeEntityId(reporting.meterEntityId, `sensor.${deviceName}_energy_total`);
  const referenceRate = Math.max(0, Number(reporting.referenceRatePlnKwh) || 0);
  const powerKw = Math.max(0.01, Number(config.powerKw) || 0.01);
  const stopDelay = durationFromSeconds(reporting.stopDelaySeconds);
  const commandPrefix = `eo_${deviceName}_execution`;
  const startEnergyLine = reporting.mode === 'meter'
    ? `        "meter_start_kwh": {{ states('${meterEntityId}') | float(0) }},`
    : `        "power_kw": ${powerKw},`;
  const stopEnergyLine = reporting.mode === 'meter'
    ? `        "meter_end_kwh": {{ states('${meterEntityId}') | float(0) }},\n`
    : '';

  return `# Raportowanie faktycznego wykonania do dashboardu /savings.
# Jeżeli masz już sekcje rest_command: lub automation:, dodaj tylko ich elementy,
# zamiast tworzyć drugi nagłówek o tej samej nazwie.
rest_command:
  ${commandPrefix}_start:
    url: "${EXECUTION_URL}"
    method: POST
    headers:
      Authorization: "Bearer ${token}"
      Content-Type: "application/json"
    payload: >-
      {
        "action": "start",
        "device_name": "${deviceName}",
        "reference_rate_pln_kwh": ${referenceRate},
${startEnergyLine}
        "source": "home_assistant"
      }

  ${commandPrefix}_stop:
    url: "${EXECUTION_URL}"
    method: POST
    headers:
      Authorization: "Bearer ${token}"
      Content-Type: "application/json"
    payload: >-
      {
        "action": "stop",
        "device_name": "${deviceName}",
${stopEnergyLine}        "source": "home_assistant"
      }

automation:
  - id: ${commandPrefix}_start
    alias: "EO - start raportu ${config.label}"
    mode: single
    trigger:
      - platform: state
        entity_id: ${triggerEntityId}
        to: "on"
    action:
      - service: rest_command.${commandPrefix}_start

  - id: ${commandPrefix}_stop
    alias: "EO - koniec raportu ${config.label}"
    mode: single
    trigger:
      - platform: state
        entity_id: ${triggerEntityId}
        to: "off"
        for: "${stopDelay}"
    action:
      - service: rest_command.${commandPrefix}_stop`;
}

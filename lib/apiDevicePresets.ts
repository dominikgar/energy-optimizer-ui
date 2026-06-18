export type ApiDevicePresetId = 'boiler' | 'ev' | 'dishwasher' | 'custom';
export type ApiScheduleDay = 'today' | 'tomorrow';

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

const SCHEDULE_URL = 'https://www.energyoptimizer.pl/api/v1/schedule/device';

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
          {{ value_json.error is not defined }}
        value_template: >-
          {{ value_json.trigger_automation | default(false) | bool }}

    sensor:
      - name: "${detailsName}"
        unique_id: ${detailsId}
        value_template: >-
          {% if value_json.error is defined %}
            Błąd API
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
          - device_name
          - generated_at`;
}

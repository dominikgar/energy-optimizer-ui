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

export function buildScheduleCurl(token: string, config: ApiDeviceConfig): string {
  const scheduleUrl = 'https://energyoptimizer.pl/api/v1/schedule/device';
  return `curl -G "${scheduleUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  --data-urlencode "day=${config.day}" \\
  --data-urlencode "device_name=${config.deviceName}" \\
  --data-urlencode "energy_kwh=${config.energyKwh}" \\
  --data-urlencode "power_kw=${config.powerKw}" \\
  --data-urlencode "earliest_start=${config.earliestStart}" \\
  --data-urlencode "latest_end=${config.latestEnd}" \\
  --data-urlencode "contiguous=${config.contiguous}"`;
}

export function buildHomeAssistantYaml(token: string, config: ApiDeviceConfig): string {
  const scheduleUrl = 'https://energyoptimizer.pl/api/v1/schedule/device';
  return `rest:
  - resource: "${scheduleUrl}"
    headers:
      Authorization: "Bearer ${token}"
    params:
      day: ${config.day}
      device_name: ${config.deviceName}
      energy_kwh: ${config.energyKwh}
      power_kw: ${config.powerKw}
      earliest_start: "${config.earliestStart}"
      latest_end: "${config.latestEnd}"
      contiguous: ${config.contiguous}
    scan_interval: 300
    binary_sensor:
      - name: "${config.sensorName}"
        unique_id: ${config.deviceName}_should_run
        value_template: "{{ value_json.trigger_automation }}"
        json_attributes:
          - recommendation_reason
          - active_slot
          - schedule
          - valid_until`;
}

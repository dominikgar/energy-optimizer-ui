export type ScheduleDay = 'today' | 'tomorrow';

export interface ParsedDeviceScheduleRequest {
  day: ScheduleDay;
  energyKwh: number;
  powerKw: number;
  contiguous: boolean;
  earliestStart: string;
  latestEnd: string;
  deviceName: string;
}

export type ParseScheduleRequestResult =
  | { ok: true; value: ParsedDeviceScheduleRequest }
  | { ok: false; error: string };

function parseNumber(value: string | null, name: string, minimum: number, maximum: number) {
  if (value === null || value.trim() === '') {
    return { value: null, error: `Brak parametru ${name}.` };
  }
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return { value: null, error: `Parametr ${name} musi być liczbą od ${minimum} do ${maximum}.` };
  }
  return { value: parsed, error: null };
}

function parseBoolean(value: string | null) {
  if (value === null || value === '') return { value: true, error: null };
  const normalized = value.toLowerCase();
  if (['true', '1', 'yes', 'tak'].includes(normalized)) return { value: true, error: null };
  if (['false', '0', 'no', 'nie'].includes(normalized)) return { value: false, error: null };
  return { value: true, error: 'Parametr contiguous musi mieć wartość true albo false.' };
}

function isValidTime(value: string): boolean {
  if (value === '24:00') return true;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function parseDeviceScheduleRequest(params: URLSearchParams): ParseScheduleRequestResult {
  const day = params.get('day') || 'today';
  if (day !== 'today' && day !== 'tomorrow') {
    return { ok: false, error: 'Parametr day musi mieć wartość today albo tomorrow.' };
  }

  const energy = parseNumber(params.get('energy_kwh'), 'energy_kwh', 0.1, 500);
  const power = parseNumber(params.get('power_kw'), 'power_kw', 0.1, 100);
  const contiguous = parseBoolean(params.get('contiguous'));
  const earliestStart = params.get('earliest_start') || '00:00';
  const latestEnd = params.get('latest_end') || '24:00';

  const error = energy.error || power.error || contiguous.error
    || (!isValidTime(earliestStart) ? 'Nieprawidłowy parametr earliest_start. Użyj formatu HH:MM.' : null)
    || (!isValidTime(latestEnd) ? 'Nieprawidłowy parametr latest_end. Użyj formatu HH:MM lub 24:00.' : null);

  if (error || energy.value === null || power.value === null) {
    return { ok: false, error: error || 'Nieprawidłowe parametry.' };
  }

  return {
    ok: true,
    value: {
      day,
      energyKwh: energy.value,
      powerKw: power.value,
      contiguous: contiguous.value,
      earliestStart,
      latestEnd,
      deviceName: (params.get('device_name') || 'device').trim().slice(0, 80) || 'device'
    }
  };
}

export function localDateTime(now: Date, timeZone: string) {
  const local = new Date(now.toLocaleString('en-US', { timeZone }));
  const date = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
  const time = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
  return { local, date, time };
}

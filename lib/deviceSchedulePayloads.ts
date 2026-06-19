import { API_VERSION } from './apiContract';
import type { DeviceScheduleResult, DeviceScheduleSlot } from './deviceScheduler';
import type { ScheduleDay } from './deviceScheduleRequest';

interface SharedPayloadInput {
  generatedAt: Date;
  timezone: string;
  baseDate: string;
  windowEndDate: string;
  day: ScheduleDay;
  deviceName: string;
  request: Record<string, unknown>;
}

export function buildUnfeasiblePayload(input: SharedPayloadInput & { result: DeviceScheduleResult }) {
  return {
    api_version: API_VERSION,
    status: 'unfeasible',
    data_source: 'PSE RCE',
    market_price_only: true,
    timezone: input.timezone,
    generated_at: input.generatedAt.toISOString(),
    date: input.baseDate,
    window_end_date: input.windowEndDate,
    day: input.day,
    device_name: input.deviceName,
    trigger_automation: false,
    recommendation_reason: input.result.reason,
    active_slot: null,
    request: input.request,
    schedule: {
      feasible: false,
      reason: input.result.reason,
      slots: []
    }
  };
}

function slotPayload(slot: DeviceScheduleSlot) {
  return {
    start_date: slot.startDate,
    start: slot.start,
    end_date: slot.endDate,
    end: slot.end,
    energy_kwh: Number(slot.energyKwh.toFixed(4)),
    price_pln_kwh: Number(slot.pricePerKwh.toFixed(4)),
    cost_pln: Number(slot.cost.toFixed(4))
  };
}

interface SuccessPayloadInput extends SharedPayloadInput {
  currentDate: string;
  currentTime: string;
  currentInterval: string | null;
  currentPrice: number | null;
  activeSlot: DeviceScheduleSlot | null;
  result: DeviceScheduleResult;
  validForSeconds: number;
}

export function buildSuccessPayload(input: SuccessPayloadInput) {
  const validUntil = new Date(input.generatedAt.getTime() + input.validForSeconds * 1000);
  return {
    api_version: API_VERSION,
    status: 'success',
    data_source: 'PSE RCE',
    market_price_only: true,
    timezone: input.timezone,
    generated_at: input.generatedAt.toISOString(),
    valid_until: validUntil.toISOString(),
    date: input.baseDate,
    window_end_date: input.windowEndDate,
    day: input.day,
    device_name: input.deviceName,
    current_date: input.currentDate,
    current_time: input.currentTime,
    current_interval: input.day === 'today' ? input.currentInterval : null,
    current_price_pln_kwh: input.day === 'today' && input.currentPrice !== null
      ? Number(input.currentPrice.toFixed(4))
      : null,
    trigger_automation: Boolean(input.activeSlot),
    recommendation_reason: input.day !== 'today'
      ? 'Harmonogram dotyczy przyszłego dnia.'
      : input.activeSlot
        ? 'Aktualny czas znajduje się w zaplanowanym interwale pracy urządzenia.'
        : 'Aktualny czas znajduje się poza zaplanowanymi interwałami pracy urządzenia.',
    active_slot: input.activeSlot ? slotPayload(input.activeSlot) : null,
    request: input.request,
    schedule: {
      feasible: true,
      crosses_midnight: input.result.crossesMidnight,
      window_duration_hours: input.result.windowDurationHours,
      slots: input.result.slots.map(slotPayload),
      total_energy_kwh: Number(input.result.totalEnergyKwh.toFixed(4)),
      total_cost_pln: Number(input.result.totalCost.toFixed(4)),
      average_price_pln_kwh: Number(input.result.averagePricePerKwh.toFixed(4)),
      runtime_hours: Number(input.result.runtimeHours.toFixed(4)),
      earliest_possible_cost_pln: input.result.earliestPossibleCost === null
        ? null
        : Number(input.result.earliestPossibleCost.toFixed(4)),
      savings_vs_earliest_pln: input.result.savingsVsEarliest === null
        ? null
        : Number(input.result.savingsVsEarliest.toFixed(4))
    }
  };
}

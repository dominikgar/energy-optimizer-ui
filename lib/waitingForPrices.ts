import { API_VERSION } from './apiContract';

export const WAITING_FOR_PRICES_RETRY_SECONDS = 300;

export interface WaitingForPricesPayloadInput {
  generatedAt: Date;
  timezone: string;
  baseDate: string;
  windowEndDate: string;
  day: 'today' | 'tomorrow';
  deviceName: string;
  currentDate: string;
  currentTime: string;
  missingPriceDates: string[];
  overnight: boolean;
  request: Record<string, unknown>;
}

export function buildWaitingForPricesPayload(input: WaitingForPricesPayloadInput) {
  const uniqueMissingDates = [...new Set(input.missingPriceDates)];
  const retryAfter = new Date(
    input.generatedAt.getTime() + WAITING_FOR_PRICES_RETRY_SECONDS * 1000
  );

  const dateDescription = uniqueMissingDates.length === 1
    ? `dnia ${uniqueMissingDates[0]}`
    : `dni ${uniqueMissingDates.join(', ')}`;
  const overnightDescription = input.overnight && uniqueMissingDates.includes(input.windowEndDate)
    ? ', wymaganych przez okno nocne'
    : '';
  const recommendationReason = `Oczekiwanie na publikację cen PSE dla ${dateDescription}${overnightDescription}. Harmonogram zostanie wyliczony automatycznie po kolejnym odświeżeniu.`;

  return {
    api_version: API_VERSION,
    status: 'waiting_for_prices',
    data_source: 'PSE RCE',
    market_price_only: true,
    timezone: input.timezone,
    generated_at: input.generatedAt.toISOString(),
    valid_until: retryAfter.toISOString(),
    date: input.baseDate,
    window_end_date: input.windowEndDate,
    day: input.day,
    device_name: input.deviceName,
    current_date: input.currentDate,
    current_time: input.currentTime,
    trigger_automation: false,
    recommendation_reason: recommendationReason,
    active_slot: null,
    waiting_for_prices: true,
    missing_price_dates: uniqueMissingDates,
    retry_after: retryAfter.toISOString(),
    retry_after_seconds: WAITING_FOR_PRICES_RETRY_SECONDS,
    request: input.request,
    schedule: {
      status: 'pending',
      feasible: null,
      reason: recommendationReason,
      slots: []
    }
  };
}

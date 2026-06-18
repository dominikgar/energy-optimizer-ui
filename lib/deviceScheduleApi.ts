import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from './apiSubscription';
import { scheduleDevice } from './deviceScheduler';
import { fetchPseDayForecast } from './pse';
import { addDays, crossesMidnight, isCurrentInsideSlot, resolveBaseDate } from './overnightWindow';
import { buildWaitingForPricesPayload } from './waitingForPrices';

const TIME_ZONE = 'Europe/Warsaw';
const RESPONSE_TTL_SECONDS = 300;

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null || value === '') return { value: fallback, error: null };
  const normalized = value.toLowerCase();
  if (['true', '1', 'yes', 'tak'].includes(normalized)) return { value: true, error: null };
  if (['false', '0', 'no', 'nie'].includes(normalized)) return { value: false, error: null };
  return { value: fallback, error: 'Parametr contiguous musi mieć wartość true albo false.' };
}

function isValidTime(value: string): boolean {
  if (value === '24:00') return true;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function json(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export async function handleDeviceScheduleRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const params = request.nextUrl.searchParams;
    const day = params.get('day') || 'today';
    if (day !== 'today' && day !== 'tomorrow') {
      return json({ error: 'Parametr day musi mieć wartość today albo tomorrow.' }, 400);
    }

    const energy = parseNumber(params.get('energy_kwh'), 'energy_kwh', 0.1, 500);
    const power = parseNumber(params.get('power_kw'), 'power_kw', 0.1, 100);
    const contiguous = parseBoolean(params.get('contiguous'), true);
    const earliestStart = params.get('earliest_start') || '00:00';
    const latestEnd = params.get('latest_end') || '24:00';
    const deviceName = (params.get('device_name') || 'device').trim().slice(0, 80) || 'device';

    const validationError = energy.error || power.error || contiguous.error
      || (!isValidTime(earliestStart) ? 'Nieprawidłowy parametr earliest_start. Użyj formatu HH:MM.' : null)
      || (!isValidTime(latestEnd) ? 'Nieprawidłowy parametr latest_end. Użyj formatu HH:MM lub 24:00.' : null);

    if (validationError || energy.value === null || power.value === null) {
      return json({ error: validationError }, 400);
    }

    const generatedAt = new Date();
    const localNow = new Date(generatedAt.toLocaleString('en-US', { timeZone: TIME_ZONE }));
    const currentDate = formatDate(localNow);
    const currentTime = `${String(localNow.getHours()).padStart(2, '0')}:${String(localNow.getMinutes()).padStart(2, '0')}`;
    const overnight = crossesMidnight(earliestStart, latestEnd);
    const baseDate = resolveBaseDate(currentDate, currentTime, day, earliestStart, latestEnd);
    const nextDate = addDays(baseDate, 1);
    const requestData = {
      energy_kwh: energy.value,
      power_kw: power.value,
      earliest_start: earliestStart,
      latest_end: latestEnd,
      contiguous: contiguous.value,
      crosses_midnight: overnight
    };

    const [forecast, nextForecast] = await Promise.all([
      fetchPseDayForecast(baseDate),
      overnight ? fetchPseDayForecast(nextDate) : Promise.resolve(null)
    ]);

    const missingPriceDates = [
      !forecast ? baseDate : null,
      overnight && !nextForecast ? nextDate : null
    ].filter((date): date is string => Boolean(date));

    if (missingPriceDates.length > 0) {
      return json(buildWaitingForPricesPayload({
        generatedAt,
        timezone: TIME_ZONE,
        baseDate,
        windowEndDate: overnight ? nextDate : baseDate,
        day,
        deviceName,
        currentDate,
        currentTime,
        missingPriceDates,
        overnight,
        request: requestData
      }));
    }

    const intervals = forecast.prices.map((item) => ({
      start: item.time,
      pricePerKwh: item.pricePerKwh,
      durationMinutes: forecast.intervalMinutes,
      dayOffset: 0,
      date: baseDate
    }));

    if (overnight && nextForecast) {
      intervals.push(...nextForecast.prices.map((item) => ({
        start: item.time,
        pricePerKwh: item.pricePerKwh,
        durationMinutes: nextForecast.intervalMinutes,
        dayOffset: 1,
        date: nextDate
      })));
    }

    const result = scheduleDevice(intervals, {
      energyRequiredKwh: energy.value,
      maxPowerKw: power.value,
      earliestStart,
      latestEnd,
      requireContiguous: contiguous.value
    });

    if (!result.feasible) {
      return json({
        status: 'unfeasible',
        data_source: 'PSE RCE',
        market_price_only: true,
        timezone: TIME_ZONE,
        generated_at: generatedAt.toISOString(),
        date: baseDate,
        window_end_date: overnight ? nextDate : baseDate,
        day,
        device_name: deviceName,
        trigger_automation: false,
        recommendation_reason: result.reason,
        active_slot: null,
        request: requestData,
        schedule: { feasible: false, reason: result.reason, slots: [] }
      });
    }

    const relevantForecast = currentDate === baseDate ? forecast : currentDate === nextDate ? nextForecast : null;
    const currentIntervalMinute = relevantForecast
      ? Math.floor(localNow.getMinutes() / relevantForecast.intervalMinutes) * relevantForecast.intervalMinutes
      : null;
    const currentInterval = currentIntervalMinute === null
      ? null
      : `${String(localNow.getHours()).padStart(2, '0')}:${String(currentIntervalMinute).padStart(2, '0')}`;
    const currentPrice = relevantForecast && currentInterval
      ? relevantForecast.prices.find((item) => item.time === currentInterval)?.pricePerKwh ?? null
      : null;
    const activeSlot = day === 'today'
      ? result.slots.find((slot) => isCurrentInsideSlot(currentDate, currentTime, slot)) ?? null
      : null;
    const validUntil = new Date(generatedAt.getTime() + RESPONSE_TTL_SECONDS * 1000);

    return json({
      status: 'success',
      data_source: 'PSE RCE',
      market_price_only: true,
      timezone: TIME_ZONE,
      generated_at: generatedAt.toISOString(),
      valid_until: validUntil.toISOString(),
      date: baseDate,
      window_end_date: overnight ? nextDate : baseDate,
      day,
      device_name: deviceName,
      current_date: currentDate,
      current_time: currentTime,
      current_interval: day === 'today' ? currentInterval : null,
      current_price_pln_kwh: day === 'today' && currentPrice !== null ? Number(currentPrice.toFixed(4)) : null,
      trigger_automation: Boolean(activeSlot),
      recommendation_reason: day !== 'today'
        ? 'Harmonogram dotyczy przyszłego dnia.'
        : activeSlot
          ? 'Aktualny czas znajduje się w zaplanowanym interwale pracy urządzenia.'
          : 'Aktualny czas znajduje się poza zaplanowanymi interwałami pracy urządzenia.',
      active_slot: activeSlot ? {
        start_date: activeSlot.startDate,
        start: activeSlot.start,
        end_date: activeSlot.endDate,
        end: activeSlot.end,
        energy_kwh: Number(activeSlot.energyKwh.toFixed(4)),
        price_pln_kwh: Number(activeSlot.pricePerKwh.toFixed(4)),
        cost_pln: Number(activeSlot.cost.toFixed(4))
      } : null,
      request: requestData,
      schedule: {
        feasible: true,
        crosses_midnight: result.crossesMidnight,
        window_duration_hours: result.windowDurationHours,
        slots: result.slots.map((slot) => ({
          start_date: slot.startDate,
          start: slot.start,
          end_date: slot.endDate,
          end: slot.end,
          energy_kwh: Number(slot.energyKwh.toFixed(4)),
          price_pln_kwh: Number(slot.pricePerKwh.toFixed(4)),
          cost_pln: Number(slot.cost.toFixed(4))
        })),
        total_energy_kwh: Number(result.totalEnergyKwh.toFixed(4)),
        total_cost_pln: Number(result.totalCost.toFixed(4)),
        average_price_pln_kwh: Number(result.averagePricePerKwh.toFixed(4)),
        runtime_hours: Number(result.runtimeHours.toFixed(4)),
        earliest_possible_cost_pln: result.earliestPossibleCost === null ? null : Number(result.earliestPossibleCost.toFixed(4)),
        savings_vs_earliest_pln: result.savingsVsEarliest === null ? null : Number(result.savingsVsEarliest.toFixed(4))
      }
    });
  } catch (error) {
    console.error('Device schedule API error:', error);
    return json({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from '../../../../../lib/apiSubscription';
import { scheduleDevice } from '../../../../../lib/deviceScheduler';
import { fetchPseDayForecast } from '../../../../../lib/pse';
import { isTimeInsideWindow } from '../../../../../lib/timeWindow';

export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Europe/Warsaw';
const RESPONSE_TTL_SECONDS = 300;

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseNumber(
  value: string | null,
  name: string,
  minimum: number,
  maximum: number
): { value: number | null; error: string | null } {
  if (value === null || value.trim() === '') {
    return { value: null, error: `Brak parametru ${name}.` };
  }

  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return {
      value: null,
      error: `Parametr ${name} musi być liczbą od ${minimum} do ${maximum}.`
    };
  }

  return { value: parsed, error: null };
}

function parseBoolean(value: string | null, fallback: boolean): { value: boolean; error: string | null } {
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

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const params = request.nextUrl.searchParams;
    const day = params.get('day') || 'today';
    if (!['today', 'tomorrow'].includes(day)) {
      return NextResponse.json(
        { error: 'Parametr day musi mieć wartość today albo tomorrow.' },
        { status: 400 }
      );
    }

    const energy = parseNumber(params.get('energy_kwh'), 'energy_kwh', 0.1, 500);
    const power = parseNumber(params.get('power_kw'), 'power_kw', 0.1, 100);
    const contiguous = parseBoolean(params.get('contiguous'), true);
    const earliestStart = params.get('earliest_start') || '00:00';
    const latestEnd = params.get('latest_end') || '24:00';
    const deviceName = (params.get('device_name') || 'device').trim().slice(0, 80);

    const validationError = energy.error || power.error || contiguous.error
      || (!isValidTime(earliestStart) ? 'Nieprawidłowy parametr earliest_start. Użyj formatu HH:MM.' : null)
      || (!isValidTime(latestEnd) ? 'Nieprawidłowy parametr latest_end. Użyj formatu HH:MM lub 24:00.' : null);

    if (validationError || energy.value === null || power.value === null) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const generatedAt = new Date();
    const localNow = new Date(generatedAt.toLocaleString('en-US', { timeZone: TIME_ZONE }));
    const requestedDate = new Date(localNow);
    if (day === 'tomorrow') requestedDate.setDate(requestedDate.getDate() + 1);
    const date = formatDate(requestedDate);

    const forecast = await fetchPseDayForecast(date);
    if (!forecast) {
      return NextResponse.json(
        { error: `Brak danych giełdowych PSE dla dnia ${date}.` },
        { status: 404 }
      );
    }

    const result = scheduleDevice(
      forecast.prices.map((item) => ({
        start: item.time,
        pricePerKwh: item.pricePerKwh,
        durationMinutes: forecast.intervalMinutes
      })),
      {
        energyRequiredKwh: energy.value,
        maxPowerKw: power.value,
        earliestStart,
        latestEnd,
        requireContiguous: contiguous.value
      }
    );

    if (!result.feasible) {
      return NextResponse.json({
        status: 'unfeasible',
        data_source: 'PSE RCE',
        market_price_only: true,
        timezone: TIME_ZONE,
        generated_at: generatedAt.toISOString(),
        date,
        day,
        device_name: deviceName,
        trigger_automation: false,
        reason: result.reason,
        request: {
          energy_kwh: energy.value,
          power_kw: power.value,
          earliest_start: earliestStart,
          latest_end: latestEnd,
          contiguous: contiguous.value
        }
      }, { status: 422 });
    }

    const currentTime = `${String(localNow.getHours()).padStart(2, '0')}:${String(localNow.getMinutes()).padStart(2, '0')}`;
    const currentIntervalMinute = Math.floor(localNow.getMinutes() / forecast.intervalMinutes) * forecast.intervalMinutes;
    const currentInterval = `${String(localNow.getHours()).padStart(2, '0')}:${String(currentIntervalMinute).padStart(2, '0')}`;
    const currentPrice = forecast.prices.find((item) => item.time === currentInterval)?.pricePerKwh ?? null;
    const activeSlot = day === 'today'
      ? result.slots.find((slot) => isTimeInsideWindow(currentTime, slot.start, slot.end)) ?? null
      : null;
    const triggerAutomation = Boolean(activeSlot);
    const validUntil = new Date(generatedAt.getTime() + RESPONSE_TTL_SECONDS * 1000);

    const response = NextResponse.json({
      status: 'success',
      data_source: 'PSE RCE',
      market_price_only: true,
      timezone: TIME_ZONE,
      generated_at: generatedAt.toISOString(),
      valid_until: validUntil.toISOString(),
      date,
      day,
      device_name: deviceName,
      current_time: currentTime,
      current_interval: day === 'today' ? currentInterval : null,
      current_price_pln_kwh: day === 'today' && currentPrice !== null
        ? Number(currentPrice.toFixed(4))
        : null,
      trigger_automation: triggerAutomation,
      recommendation_reason: day !== 'today'
        ? 'Harmonogram dotyczy przyszłego dnia.'
        : triggerAutomation
          ? 'Aktualny czas znajduje się w zaplanowanym interwale pracy urządzenia.'
          : 'Aktualny czas znajduje się poza zaplanowanymi interwałami pracy urządzenia.',
      active_slot: activeSlot ? {
        start: activeSlot.start,
        end: activeSlot.end,
        energy_kwh: Number(activeSlot.energyKwh.toFixed(4)),
        price_pln_kwh: Number(activeSlot.pricePerKwh.toFixed(4)),
        cost_pln: Number(activeSlot.cost.toFixed(4))
      } : null,
      request: {
        energy_kwh: energy.value,
        power_kw: power.value,
        earliest_start: earliestStart,
        latest_end: latestEnd,
        contiguous: contiguous.value
      },
      schedule: {
        feasible: true,
        slots: result.slots.map((slot) => ({
          start: slot.start,
          end: slot.end,
          energy_kwh: Number(slot.energyKwh.toFixed(4)),
          price_pln_kwh: Number(slot.pricePerKwh.toFixed(4)),
          cost_pln: Number(slot.cost.toFixed(4))
        })),
        total_energy_kwh: Number(result.totalEnergyKwh.toFixed(4)),
        total_cost_pln: Number(result.totalCost.toFixed(4)),
        average_price_pln_kwh: Number(result.averagePricePerKwh.toFixed(4)),
        runtime_hours: Number(result.runtimeHours.toFixed(4)),
        earliest_possible_cost_pln: result.earliestPossibleCost === null
          ? null
          : Number(result.earliestPossibleCost.toFixed(4)),
        savings_vs_earliest_pln: result.savingsVsEarliest === null
          ? null
          : Number(result.savingsVsEarliest.toFixed(4))
      }
    });

    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Device schedule API error:', error);
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera.' }, { status: 500 });
  }
}

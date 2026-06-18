import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from './apiSubscription';
import { scheduleDevice } from './deviceScheduler';
import { fetchPseDayForecast } from './pse';
import { addDays, crossesMidnight, isCurrentInsideSlot, resolveBaseDate } from './overnightWindow';
import { parseDeviceScheduleRequest, localDateTime } from './deviceScheduleRequest';
import { buildUnfeasiblePayload, buildSuccessPayload } from './deviceSchedulePayloads';
import { buildWaitingForPricesPayload } from './waitingForPrices';

const TIME_ZONE = 'Europe/Warsaw';
const RESPONSE_TTL_SECONDS = 300;

function json(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export async function handleDeviceScheduleRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const parsed = parseDeviceScheduleRequest(request.nextUrl.searchParams);
    if (!parsed.ok) return json({ error: parsed.error }, 400);

    const config = parsed.value;
    const generatedAt = new Date();
    const now = localDateTime(generatedAt, TIME_ZONE);
    const overnight = crossesMidnight(config.earliestStart, config.latestEnd);
    const baseDate = resolveBaseDate(
      now.date,
      now.time,
      config.day,
      config.earliestStart,
      config.latestEnd
    );
    const nextDate = addDays(baseDate, 1);
    const windowEndDate = overnight ? nextDate : baseDate;
    const requestData = {
      energy_kwh: config.energyKwh,
      power_kw: config.powerKw,
      earliest_start: config.earliestStart,
      latest_end: config.latestEnd,
      contiguous: config.contiguous,
      crosses_midnight: overnight
    };

    const [forecast, nextForecast] = await Promise.all([
      fetchPseDayForecast(baseDate),
      overnight ? fetchPseDayForecast(nextDate) : Promise.resolve(null)
    ]);

    if (!forecast || (overnight && !nextForecast)) {
      const missingPriceDates = [
        !forecast ? baseDate : null,
        overnight && !nextForecast ? nextDate : null
      ].filter((date): date is string => Boolean(date));

      return json(buildWaitingForPricesPayload({
        generatedAt,
        timezone: TIME_ZONE,
        baseDate,
        windowEndDate,
        day: config.day,
        deviceName: config.deviceName,
        currentDate: now.date,
        currentTime: now.time,
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
      energyRequiredKwh: config.energyKwh,
      maxPowerKw: config.powerKw,
      earliestStart: config.earliestStart,
      latestEnd: config.latestEnd,
      requireContiguous: config.contiguous
    });

    const shared = {
      generatedAt,
      timezone: TIME_ZONE,
      baseDate,
      windowEndDate,
      day: config.day,
      deviceName: config.deviceName,
      request: requestData
    };

    if (!result.feasible) {
      return json(buildUnfeasiblePayload({ ...shared, result }));
    }

    const relevantForecast = now.date === baseDate
      ? forecast
      : now.date === nextDate
        ? nextForecast
        : null;
    const intervalMinute = relevantForecast
      ? Math.floor(now.local.getMinutes() / relevantForecast.intervalMinutes) * relevantForecast.intervalMinutes
      : null;
    const currentInterval = intervalMinute === null
      ? null
      : `${String(now.local.getHours()).padStart(2, '0')}:${String(intervalMinute).padStart(2, '0')}`;
    const currentPrice = relevantForecast && currentInterval
      ? relevantForecast.prices.find((item) => item.time === currentInterval)?.pricePerKwh ?? null
      : null;
    const activeSlot = config.day === 'today'
      ? result.slots.find((slot) => isCurrentInsideSlot(now.date, now.time, slot)) ?? null
      : null;

    return json(buildSuccessPayload({
      ...shared,
      currentDate: now.date,
      currentTime: now.time,
      currentInterval,
      currentPrice,
      activeSlot,
      result,
      validForSeconds: RESPONSE_TTL_SECONDS
    }));
  } catch (error) {
    console.error('Device schedule API error:', error);
    return json({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

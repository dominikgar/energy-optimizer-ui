import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pool } from '../../../../lib/db';
import { fetchPseDayForecast } from '../../../../lib/pse';
import { createRequestId, recordAppEvent } from '../../../../lib/appEvents';

export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Europe/Warsaw';

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request);
  const startedAt = Date.now();
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
  }

  try {
    const offset = Number.parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);
    if (!Number.isInteger(offset) || offset < 0 || offset > 2) {
      return NextResponse.json({ error: 'Parametr offset musi mieć wartość 0, 1 albo 2.' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT is_active, current_period_end
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    const subscription = rows[0];
    const expired = subscription?.current_period_end
      && new Date(subscription.current_period_end) < new Date();

    if (!subscription?.is_active || expired) {
      return NextResponse.json({ error: 'Planer wymaga aktywnej subskrypcji PRO.' }, { status: 403 });
    }

    const now = new Date();
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: TIME_ZONE }));
    localNow.setDate(localNow.getDate() + offset);
    const date = formatDate(localNow);
    const forecast = await fetchPseDayForecast(date);

    if (!forecast) {
      await recordAppEvent({
        level: 'info',
        source: 'pse-forecast',
        eventType: 'forecast.not_published',
        message: `PSE nie opublikowało jeszcze danych dla dnia ${date}.`,
        userId,
        requestId,
        metadata: {
          date,
          offset,
          duration_ms: Date.now() - startedAt
        }
      });
      return NextResponse.json(
        { error: `PSE nie opublikowało jeszcze danych dla dnia ${date}.` },
        { status: 404 }
      );
    }

    await recordAppEvent({
      level: 'info',
      source: 'pse-forecast',
      eventType: 'forecast.loaded',
      message: `Pobrano prognozę PSE dla dnia ${date}.`,
      userId,
      requestId,
      metadata: {
        date,
        offset,
        interval_minutes: forecast.intervalMinutes,
        price_points: forecast.prices.length,
        duration_ms: Date.now() - startedAt
      }
    });

    const response = NextResponse.json({
      date: forecast.date,
      label: offset === 0 ? 'Dzisiaj' : offset === 1 ? 'Jutro' : 'Pojutrze',
      intervalMinutes: forecast.intervalMinutes,
      prices: forecast.prices
    });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    await recordAppEvent({
      level: 'error',
      source: 'pse-forecast',
      eventType: 'forecast.failed',
      message: 'Nie udało się pobrać prognozy PSE dla planera.',
      userId,
      requestId,
      metadata: {
        duration_ms: Date.now() - startedAt,
        error
      }
    });
    return NextResponse.json({ error: 'Błąd pobierania danych PSE.' }, { status: 500 });
  }
}

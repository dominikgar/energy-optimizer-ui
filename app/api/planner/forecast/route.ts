import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pool } from '../../../../lib/db';
import { fetchPseDayForecast } from '../../../../lib/pse';

export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Europe/Warsaw';

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
  }

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
    return NextResponse.json(
      { error: `PSE nie opublikowało jeszcze danych dla dnia ${date}.` },
      { status: 404 }
    );
  }

  const response = NextResponse.json({
    date: forecast.date,
    label: offset === 0 ? 'Dzisiaj' : offset === 1 ? 'Jutro' : 'Pojutrze',
    intervalMinutes: forecast.intervalMinutes,
    prices: forecast.prices
  });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

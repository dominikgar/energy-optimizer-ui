import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { Pool } from 'pg';
import { isTimeInsideWindow } from '../../../../../lib/timeWindow';

export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Europe/Warsaw';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function extractTime(row: any, itemCount: number): string | null {
  const source = String(row.dtime || row.udtczas || row.udtczas_oreb || row.data_czas || row.period || row.okres || '');
  const match = source.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;

  const period = Number.parseInt(String(row.period ?? row.okres ?? ''), 10);
  if (Number.isFinite(period)) {
    if (itemCount > 30) {
      const hour = Math.floor((period - 1) / 4);
      const minute = ((period - 1) % 4) * 15;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    return `${String(Math.max(0, period - 1)).padStart(2, '0')}:00`;
  }

  const hour = Number.parseInt(String(row.godzina ?? ''), 10);
  return Number.isFinite(hour) ? `${String(Math.max(0, hour - 1)).padStart(2, '0')}:00` : null;
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + (minute || 0);
}

async function getDayForecast(targetDate: string) {
  const params = new URLSearchParams({ '$filter': `business_date eq '${targetDate}'` });
  let response = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`, { cache: 'no-store' });
  let json = response.ok ? await response.json() : { value: [] };

  if (!Array.isArray(json.value) || json.value.length === 0) {
    const fallback = new URLSearchParams({ '$filter': `doba eq '${targetDate}'` });
    response = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${fallback.toString()}`, { cache: 'no-store' });
    json = response.ok ? await response.json() : { value: [] };
  }

  if (!Array.isArray(json.value) || json.value.length === 0) return null;

  const prices = json.value
    .map((row: any) => {
      const time = extractTime(row, json.value.length);
      const price = Number(row.rce_pln) / 1000;
      return time && Number.isFinite(price) ? { time, price } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const quarterHourly = prices.length > 30;
  const windowSize = quarterHourly ? 12 : 3;
  if (prices.length < windowSize) return null;

  let start = '';
  let end = '';
  let average = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= prices.length - windowSize; index++) {
    const window = prices.slice(index, index + windowSize);
    const candidate = window.reduce((sum: number, item: any) => sum + item.price, 0) / windowSize;
    if (candidate >= average) continue;

    average = candidate;
    start = window[0].time;
    const endMinutes = (timeToMinutes(window[window.length - 1].time) + (quarterHourly ? 15 : 60)) % 1440;
    end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  }

  return { prices, start, end, average, quarterHourly };
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const header = request.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    const token = header.slice(7).trim();
    const { rows } = await pool.query(
      'SELECT is_active, current_period_end FROM user_subscriptions WHERE api_key = $1',
      [token]
    );
    const subscription = rows[0];
    const expired = subscription?.current_period_end && new Date(subscription.current_period_end) < new Date();
    if (!subscription?.is_active || expired) {
      return NextResponse.json({ error: 'Nieprawidłowy klucz lub brak aktywnej subskrypcji PRO.' }, { status: 403 });
    }

    const generatedAt = new Date();
    const localNow = new Date(generatedAt.toLocaleString('en-US', { timeZone: TIME_ZONE }));
    const today = formatDate(localNow);
    const tomorrowDate = new Date(localNow);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = formatDate(tomorrowDate);

    const [todayData, tomorrowData] = await Promise.all([
      getDayForecast(today),
      getDayForecast(tomorrow)
    ]);

    if (!todayData) {
      return NextResponse.json({ error: 'Brak danych giełdowych PSE na dziś.' }, { status: 404 });
    }

    const intervalMinute = todayData.quarterHourly ? Math.floor(localNow.getMinutes() / 15) * 15 : 0;
    const currentInterval = `${String(localNow.getHours()).padStart(2, '0')}:${String(intervalMinute).padStart(2, '0')}`;
    const currentPrice = todayData.prices.find((item: any) => item.time === currentInterval)?.price ?? null;
    const trigger = currentPrice !== null && isTimeInsideWindow(currentInterval, todayData.start, todayData.end);
    const validUntil = new Date(generatedAt.getTime() + (todayData.quarterHourly ? 15 : 60) * 60 * 1000);

    return NextResponse.json({
      status: 'success',
      data_source: 'PSE RCE',
      timezone: TIME_ZONE,
      generated_at: generatedAt.toISOString(),
      valid_until: validUntil.toISOString(),
      market_price_only: true,
      date: today,
      recommended_start: todayData.start,
      recommended_end: todayData.end,
      avg_price_pln: Number(todayData.average.toFixed(4)),
      current_price_pln: currentPrice === null ? null : Number(currentPrice.toFixed(4)),
      current_interval: currentInterval,
      trigger_automation: trigger,
      recommendation_reason: trigger
        ? 'Aktualny interwał znajduje się w rekomendowanym oknie.'
        : 'Aktualny interwał znajduje się poza rekomendowanym oknem.',
      tomorrow_data_available: Boolean(tomorrowData),
      tomorrow_date: tomorrow,
      tomorrow_recommended_start: tomorrowData?.start ?? null,
      tomorrow_recommended_end: tomorrowData?.end ?? null,
      tomorrow_avg_price_pln: tomorrowData ? Number(tomorrowData.average.toFixed(4)) : null
    });
  } catch (error) {
    console.error('Forecast API Error:', error);
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera.' }, { status: 500 });
  }
}

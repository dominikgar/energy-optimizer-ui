import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from '../../../../../lib/apiSubscription';
import { fetchPseDayForecast } from '../../../../../lib/pse';
import { isTimeInsideWindow } from '../../../../../lib/timeWindow';

export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Europe/Warsaw';

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const generatedAt = new Date();
    const localNow = new Date(generatedAt.toLocaleString('en-US', { timeZone: TIME_ZONE }));
    const today = formatDate(localNow);
    const tomorrowDate = new Date(localNow);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = formatDate(tomorrowDate);

    const [todayData, tomorrowData] = await Promise.all([
      fetchPseDayForecast(today),
      fetchPseDayForecast(tomorrow)
    ]);

    if (!todayData) {
      return NextResponse.json({ error: 'Brak danych giełdowych PSE na dziś.' }, { status: 404 });
    }

    const intervalMinute = Math.floor(localNow.getMinutes() / todayData.intervalMinutes) * todayData.intervalMinutes;
    const currentInterval = `${String(localNow.getHours()).padStart(2, '0')}:${String(intervalMinute).padStart(2, '0')}`;
    const currentPrice = todayData.prices.find((item) => item.time === currentInterval)?.pricePerKwh ?? null;
    const trigger = currentPrice !== null && isTimeInsideWindow(
      currentInterval,
      todayData.bestWindowStart,
      todayData.bestWindowEnd
    );
    const validUntil = new Date(generatedAt.getTime() + todayData.intervalMinutes * 60 * 1000);

    return NextResponse.json({
      status: 'success',
      data_source: 'PSE RCE',
      timezone: TIME_ZONE,
      generated_at: generatedAt.toISOString(),
      valid_until: validUntil.toISOString(),
      market_price_only: true,
      date: today,
      recommended_start: todayData.bestWindowStart,
      recommended_end: todayData.bestWindowEnd,
      avg_price_pln: Number(todayData.bestWindowAveragePrice.toFixed(4)),
      current_price_pln: currentPrice === null ? null : Number(currentPrice.toFixed(4)),
      current_interval: currentInterval,
      trigger_automation: trigger,
      recommendation_reason: trigger
        ? 'Aktualny interwał znajduje się w rekomendowanym oknie.'
        : 'Aktualny interwał znajduje się poza rekomendowanym oknem.',
      tomorrow_data_available: Boolean(tomorrowData),
      tomorrow_date: tomorrow,
      tomorrow_recommended_start: tomorrowData?.bestWindowStart ?? null,
      tomorrow_recommended_end: tomorrowData?.bestWindowEnd ?? null,
      tomorrow_avg_price_pln: tomorrowData
        ? Number(tomorrowData.bestWindowAveragePrice.toFixed(4))
        : null
    });
  } catch (error) {
    console.error('Forecast API Error:', error);
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera.' }, { status: 500 });
  }
}

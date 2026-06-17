export interface PsePricePoint {
  time: string;
  pricePerKwh: number;
}

export interface PseDayForecast {
  date: string;
  prices: PsePricePoint[];
  intervalMinutes: number;
  bestWindowStart: string;
  bestWindowEnd: string;
  bestWindowAveragePrice: number;
  worstWindowStart: string;
  worstWindowEnd: string;
  worstWindowAveragePrice: number;
  minimumPrice: number;
  maximumPrice: number;
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + (minute || 0);
}

function formatMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function extractTime(row: Record<string, unknown>, itemCount: number): string | null {
  const explicit = String(row.dtime || row.udtczas || row.udtczas_oreb || row.data_czas || '');
  const explicitMatch = explicit.match(/(\d{1,2}):(\d{2})/);
  if (explicitMatch) {
    return `${String(Number(explicitMatch[1])).padStart(2, '0')}:${explicitMatch[2]}`;
  }

  const periodValue = row.period ?? row.okres;
  if (periodValue !== undefined && periodValue !== null) {
    const periodText = String(periodValue);
    const periodTimeMatch = periodText.match(/(\d{1,2}):(\d{2})/);
    if (periodTimeMatch) {
      return `${String(Number(periodTimeMatch[1])).padStart(2, '0')}:${periodTimeMatch[2]}`;
    }

    const periodNumber = Number.parseInt(periodText, 10);
    if (Number.isFinite(periodNumber)) {
      if (itemCount > 30) {
        const hour = Math.floor((periodNumber - 1) / 4);
        const minute = ((periodNumber - 1) % 4) * 15;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
      return `${String(Math.max(0, periodNumber - 1)).padStart(2, '0')}:00`;
    }
  }

  const hourNumber = Number.parseInt(String(row.godzina ?? ''), 10);
  if (Number.isFinite(hourNumber)) {
    return `${String(Math.max(0, hourNumber - 1)).padStart(2, '0')}:00`;
  }

  return null;
}

async function fetchRawPseRows(date: string): Promise<Record<string, unknown>[]> {
  const filters = [
    `business_date eq '${date}'`,
    `doba eq '${date}'`
  ];

  for (const filter of filters) {
    const params = new URLSearchParams({ '$filter': filter });
    const response = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) continue;
    const payload = await response.json();
    if (Array.isArray(payload.value) && payload.value.length > 0) {
      return payload.value;
    }
  }

  return [];
}

export async function fetchPseDayForecast(date: string, windowHours = 3): Promise<PseDayForecast | null> {
  const rows = await fetchRawPseRows(date);
  if (rows.length === 0) return null;

  const prices = rows
    .map((row) => {
      const time = extractTime(row, rows.length);
      const pricePerMwh = Number(row.rce_pln);
      if (!time || !Number.isFinite(pricePerMwh)) return null;
      return { time, pricePerKwh: pricePerMwh / 1000 };
    })
    .filter((item): item is PsePricePoint => item !== null)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  if (prices.length === 0) return null;

  const intervalMinutes = prices.length > 30 ? 15 : 60;
  const windowSize = Math.max(1, Math.round((windowHours * 60) / intervalMinutes));
  if (prices.length < windowSize) return null;

  let bestWindowStart = '';
  let bestWindowEnd = '';
  let bestWindowAveragePrice = Number.POSITIVE_INFINITY;
  let worstWindowStart = '';
  let worstWindowEnd = '';
  let worstWindowAveragePrice = Number.NEGATIVE_INFINITY;

  for (let index = 0; index <= prices.length - windowSize; index++) {
    const window = prices.slice(index, index + windowSize);
    const average = window.reduce((sum, item) => sum + item.pricePerKwh, 0) / window.length;
    const end = formatMinutes(timeToMinutes(window[window.length - 1].time) + intervalMinutes);

    if (average < bestWindowAveragePrice) {
      bestWindowAveragePrice = average;
      bestWindowStart = window[0].time;
      bestWindowEnd = end;
    }

    if (average > worstWindowAveragePrice) {
      worstWindowAveragePrice = average;
      worstWindowStart = window[0].time;
      worstWindowEnd = end;
    }
  }

  return {
    date,
    prices,
    intervalMinutes,
    bestWindowStart,
    bestWindowEnd,
    bestWindowAveragePrice,
    worstWindowStart,
    worstWindowEnd,
    worstWindowAveragePrice,
    minimumPrice: Math.min(...prices.map((item) => item.pricePerKwh)),
    maximumPrice: Math.max(...prices.map((item) => item.pricePerKwh))
  };
}

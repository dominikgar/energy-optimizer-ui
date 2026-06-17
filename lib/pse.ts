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

const PSE_ENDPOINT = 'https://api.raporty.pse.pl/api/rce-pln';

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + (minute || 0);
}

function formatMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function extractTime(row: Record<string, unknown>, itemCount: number): string | null {
  // `period` opisuje początek interwału, podczas gdy `dtime` w danych
  // 15-minutowych PSE wskazuje zwykle jego koniec. Do planowania używamy startu.
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

  const explicit = String(row.dtime || row.udtczas || row.udtczas_oreb || row.data_czas || '');
  const explicitMatch = explicit.match(/(\d{1,2}):(\d{2})/);
  if (explicitMatch) {
    return `${String(Number(explicitMatch[1])).padStart(2, '0')}:${explicitMatch[2]}`;
  }

  const hourNumber = Number.parseInt(String(row.godzina ?? ''), 10);
  if (Number.isFinite(hourNumber)) {
    return `${String(Math.max(0, hourNumber - 1)).padStart(2, '0')}:00`;
  }

  return null;
}

function buildPseFilterUrl(filter: string): string {
  // API PSE odrzuca wariant generowany przez URLSearchParams, w którym
  // `$filter` staje się `%24filter`, a spacje są kodowane jako `+`.
  // Pozostawiamy nazwę parametru literalnie i kodujemy spacje jako `%20`.
  return `${PSE_ENDPOINT}?$filter=${filter.replace(/ /g, '%20')}`;
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return [];
  const value = (payload as Record<string, unknown>).value;
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}

function rowMatchesDate(row: Record<string, unknown>, date: string): boolean {
  const businessDate = String(row.business_date ?? row.doba ?? '');
  if (businessDate) return businessDate.startsWith(date);

  const dateTime = String(row.dtime ?? row.dtime_utc ?? row.data_czas ?? '');
  return dateTime.startsWith(date);
}

async function fetchPseRows(url: string, date: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000)
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error('PSE API request failed', {
      status: response.status,
      url,
      response: payload ?? text.slice(0, 500)
    });
    return [];
  }

  return extractRows(payload).filter((row) => rowMatchesDate(row, date));
}

async function fetchRawPseRows(date: string): Promise<Record<string, unknown>[]> {
  const filters = [
    `business_date eq '${date}'`,
    `business_date eq ${date}`,
    `doba eq '${date}'`
  ];

  for (const filter of filters) {
    try {
      const rows = await fetchPseRows(buildPseFilterUrl(filter), date);
      if (rows.length > 0) return rows;
    } catch (error) {
      console.error('PSE API connection error', {
        filter,
        error: error instanceof Error ? error.message : String(error)
      });
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

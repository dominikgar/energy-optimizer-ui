import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ENDPOINT = 'https://api.raporty.pse.pl/api/rce-pln';
const TIME_ZONE = 'Europe/Warsaw';

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function summarizePayload(payload: unknown) {
  const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const value = Array.isArray(body.value) ? body.value as Record<string, unknown>[] : [];
  const first = value[0] || null;
  const dates = Array.from(new Set(
    value
      .map((row) => String(row.business_date ?? row.doba ?? row.date ?? ''))
      .filter(Boolean)
  )).slice(0, 10);

  return {
    topLevelKeys: Object.keys(body),
    count: value.length,
    firstRowKeys: first ? Object.keys(first) : [],
    detectedDates: dates,
    firstRow: first ? {
      business_date: first.business_date ?? null,
      doba: first.doba ?? null,
      period: first.period ?? first.okres ?? null,
      dtime: first.dtime ?? null,
      rce_pln: first.rce_pln ?? null
    } : null
  };
}

async function probe(label: string, url: string) {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    return {
      label,
      url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      summary: summarizePayload(payload),
      nonJsonPreview: payload === null ? text.slice(0, 300) : null
    };
  } catch (error) {
    return {
      label,
      url,
      status: null,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function GET() {
  const now = new Date();
  const polishNow = new Date(now.toLocaleString('en-US', { timeZone: TIME_ZONE }));
  const yesterday = new Date(polishNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(polishNow);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dates = {
    yesterday: formatDate(yesterday),
    today: formatDate(polishNow),
    tomorrow: formatDate(tomorrow)
  };

  const filteredUrl = (field: string, date: string) => {
    const params = new URLSearchParams({ '$filter': `${field} eq '${date}'` });
    return `${ENDPOINT}?${params.toString()}`;
  };

  const probes = await Promise.all([
    probe('unfiltered', ENDPOINT),
    probe('today-business-date', filteredUrl('business_date', dates.today)),
    probe('yesterday-business-date', filteredUrl('business_date', dates.yesterday)),
    probe('tomorrow-business-date', filteredUrl('business_date', dates.tomorrow)),
    probe('today-doba', filteredUrl('doba', dates.today)),
    probe('yesterday-doba', filteredUrl('doba', dates.yesterday))
  ]);

  return NextResponse.json({
    generatedAt: now.toISOString(),
    timezone: TIME_ZONE,
    dates,
    probes
  });
}

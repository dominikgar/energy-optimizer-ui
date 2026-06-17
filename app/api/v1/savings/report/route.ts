import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from '../../../../../lib/apiSubscription';
import { pool } from '../../../../../lib/db';
import { calculateRealizedSavings } from '../../../../../lib/realizedSavings';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

function parseFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'string'
    ? Number(value.replace(',', '.'))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok || !auth.userId) {
      return noStoreJson({ error: auth.error }, auth.status);
    }

    const body = await request.json();
    const deviceName = String(body.device_name || '').trim().slice(0, 80);
    const startedAt = parseDate(body.started_at);
    const endedAt = parseDate(body.ended_at);
    const energyKwh = parseFiniteNumber(body.energy_kwh);
    const referenceRate = parseFiniteNumber(body.reference_rate_pln_kwh);
    const source = String(body.source || 'home_assistant').trim().slice(0, 40) || 'home_assistant';
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

    if (!deviceName) return noStoreJson({ error: 'Brak parametru device_name.' }, 400);
    if (!startedAt || !endedAt) return noStoreJson({ error: 'started_at i ended_at muszą być poprawnymi datami ISO.' }, 400);
    if (endedAt <= startedAt) return noStoreJson({ error: 'ended_at musi być późniejsze niż started_at.' }, 400);

    const durationHours = (endedAt.getTime() - startedAt.getTime()) / 3_600_000;
    if (durationHours > 48) return noStoreJson({ error: 'Raportowany cykl nie może być dłuższy niż 48 godzin.' }, 400);
    if (energyKwh === null || energyKwh <= 0 || energyKwh > 10_000) {
      return noStoreJson({ error: 'energy_kwh musi być liczbą większą od 0 i nie większą niż 10000.' }, 400);
    }
    if (referenceRate === null || referenceRate < 0 || referenceRate > 20) {
      return noStoreJson({ error: 'reference_rate_pln_kwh musi mieścić się w zakresie 0–20.' }, 400);
    }

    const priceResult = await pool.query(
      `SELECT AVG(price_pln_mwh) / 1000.0 AS average_price, COUNT(*)::int AS sample_count
       FROM energy_prices
       WHERE timestamp >= $1 AND timestamp < $2`,
      [startedAt.toISOString(), endedAt.toISOString()]
    );

    const averagePrice = Number(priceResult.rows[0]?.average_price);
    const sampleCount = Number(priceResult.rows[0]?.sample_count || 0);
    if (!Number.isFinite(averagePrice) || sampleCount === 0) {
      return noStoreJson({ error: 'Brak cen PSE dla raportowanego okresu.' }, 422);
    }

    const savings = calculateRealizedSavings({
      energyKwh,
      averageMarketPricePlnKwh: averagePrice,
      referenceRatePlnKwh: referenceRate
    });
    if (!savings.valid) return noStoreJson({ error: savings.error }, 400);

    const saved = await pool.query(
      `INSERT INTO energy_savings_reports (
         user_id, device_name, started_at, ended_at, energy_kwh,
         average_market_price_pln_kwh, actual_market_cost_pln,
         reference_rate_pln_kwh, reference_cost_pln, savings_pln,
         source, metadata, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
       ON CONFLICT (user_id, device_name, started_at, ended_at)
       DO UPDATE SET
         energy_kwh = EXCLUDED.energy_kwh,
         average_market_price_pln_kwh = EXCLUDED.average_market_price_pln_kwh,
         actual_market_cost_pln = EXCLUDED.actual_market_cost_pln,
         reference_rate_pln_kwh = EXCLUDED.reference_rate_pln_kwh,
         reference_cost_pln = EXCLUDED.reference_cost_pln,
         savings_pln = EXCLUDED.savings_pln,
         source = EXCLUDED.source,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING id, created_at, updated_at`,
      [
        auth.userId,
        deviceName,
        startedAt.toISOString(),
        endedAt.toISOString(),
        energyKwh,
        averagePrice,
        savings.actualMarketCostPln,
        referenceRate,
        savings.referenceCostPln,
        savings.savingsPln,
        source,
        JSON.stringify(metadata)
      ]
    );

    return noStoreJson({
      status: 'success',
      market_component_only: true,
      report: {
        id: saved.rows[0].id,
        device_name: deviceName,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_hours: Number(durationHours.toFixed(3)),
        energy_kwh: energyKwh,
        price_samples: sampleCount,
        average_market_price_pln_kwh: Number(averagePrice.toFixed(4)),
        actual_market_cost_pln: Number(savings.actualMarketCostPln.toFixed(4)),
        reference_rate_pln_kwh: referenceRate,
        reference_cost_pln: Number(savings.referenceCostPln.toFixed(4)),
        savings_pln: Number(savings.savingsPln.toFixed(4)),
        savings_percent: savings.savingsPercent === null ? null : Number(savings.savingsPercent.toFixed(2)),
        source,
        created_at: saved.rows[0].created_at,
        updated_at: saved.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Savings report API error:', error);
    return noStoreJson({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok || !auth.userId) {
      return noStoreJson({ error: auth.error }, auth.status);
    }

    const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '30', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 30;

    const [reports, summary] = await Promise.all([
      pool.query(
        `SELECT id, device_name, started_at, ended_at, energy_kwh,
                average_market_price_pln_kwh, actual_market_cost_pln,
                reference_rate_pln_kwh, reference_cost_pln, savings_pln,
                source, metadata, created_at, updated_at
         FROM energy_savings_reports
         WHERE user_id = $1
         ORDER BY started_at DESC
         LIMIT $2`,
        [auth.userId, limit]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS runs,
                COALESCE(SUM(energy_kwh), 0) AS energy_kwh,
                COALESCE(SUM(actual_market_cost_pln), 0) AS actual_cost_pln,
                COALESCE(SUM(reference_cost_pln), 0) AS reference_cost_pln,
                COALESCE(SUM(savings_pln), 0) AS savings_pln
         FROM energy_savings_reports
         WHERE user_id = $1`,
        [auth.userId]
      )
    ]);

    return noStoreJson({
      status: 'success',
      market_component_only: true,
      summary: summary.rows[0],
      reports: reports.rows
    });
  } catch (error) {
    console.error('Savings history API error:', error);
    return noStoreJson({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

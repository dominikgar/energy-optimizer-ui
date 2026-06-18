import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from '../../../../../lib/apiSubscription';
import { pool } from '../../../../../lib/db';
import { createRequestId, recordAppEvent } from '../../../../../lib/appEvents';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

function rounded(value: unknown, digits = 4): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  const factor = 10 ** digits;
  return Math.round(parsed * factor) / factor;
}

function optionalRounded(value: unknown, digits = 4): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const factor = 10 ** digits;
  return Math.round(parsed * factor) / factor;
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request);

  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok || !auth.userId) {
      return noStoreJson({ error: auth.error }, auth.status);
    }

    const result = await pool.query(
      `WITH all_time AS (
         SELECT COUNT(*)::int AS total_cycles,
                COALESCE(SUM(energy_kwh), 0) AS total_energy_kwh,
                COALESCE(SUM(savings_pln), 0) AS total_savings_pln
         FROM energy_savings_reports
         WHERE user_id = $1
       ),
       month_stats AS (
         SELECT COUNT(*)::int AS month_cycles,
                COALESCE(SUM(energy_kwh), 0) AS month_energy_kwh,
                COALESCE(SUM(savings_pln), 0) AS month_savings_pln
         FROM energy_savings_reports
         WHERE user_id = $1
           AND started_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Europe/Warsaw') AT TIME ZONE 'Europe/Warsaw'
       ),
       last_cycle AS (
         SELECT device_name, ended_at, energy_kwh, savings_pln
         FROM energy_savings_reports
         WHERE user_id = $1
         ORDER BY ended_at DESC
         LIMIT 1
       ),
       execution_stats AS (
         SELECT COUNT(*) FILTER (WHERE status = 'running')::int AS running_executions,
                COUNT(*) FILTER (WHERE status = 'awaiting_prices')::int AS awaiting_price_executions,
                MAX(updated_at) AS execution_updated_at
         FROM energy_device_executions
         WHERE user_id = $1
           AND status IN ('running', 'awaiting_prices')
       ),
       report_updated AS (
         SELECT MAX(updated_at) AS report_updated_at
         FROM energy_savings_reports
         WHERE user_id = $1
       )
       SELECT all_time.*,
              month_stats.*,
              (SELECT device_name FROM last_cycle) AS last_cycle_device,
              (SELECT ended_at FROM last_cycle) AS last_cycle_ended_at,
              (SELECT energy_kwh FROM last_cycle) AS last_cycle_energy_kwh,
              (SELECT savings_pln FROM last_cycle) AS last_cycle_savings_pln,
              execution_stats.running_executions,
              execution_stats.awaiting_price_executions,
              GREATEST(report_updated.report_updated_at, execution_stats.execution_updated_at) AS updated_at
       FROM all_time
       CROSS JOIN month_stats
       CROSS JOIN execution_stats
       CROSS JOIN report_updated`,
      [auth.userId]
    );

    const row = result.rows[0] || {};
    const runningExecutions = Number(row.running_executions || 0);
    const awaitingPriceExecutions = Number(row.awaiting_price_executions || 0);

    return noStoreJson({
      status: 'success',
      currency: 'PLN',
      timezone: 'Europe/Warsaw',
      total_savings_pln: rounded(row.total_savings_pln),
      total_energy_kwh: rounded(row.total_energy_kwh),
      total_cycles: Number(row.total_cycles || 0),
      month_savings_pln: rounded(row.month_savings_pln),
      month_energy_kwh: rounded(row.month_energy_kwh),
      month_cycles: Number(row.month_cycles || 0),
      last_cycle_savings_pln: optionalRounded(row.last_cycle_savings_pln),
      last_cycle_energy_kwh: optionalRounded(row.last_cycle_energy_kwh),
      last_cycle_device: row.last_cycle_device || null,
      last_cycle_ended_at: row.last_cycle_ended_at
        ? new Date(row.last_cycle_ended_at).toISOString()
        : null,
      active_executions: runningExecutions + awaitingPriceExecutions,
      running_executions: runningExecutions,
      awaiting_price_executions: awaitingPriceExecutions,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
    });
  } catch (error) {
    console.error('Savings summary API error:', error);
    await recordAppEvent({
      level: 'error',
      source: 'savings-summary',
      eventType: 'summary.failed',
      message: 'Nie udało się przygotować podsumowania oszczędności dla Home Assistanta.',
      requestId,
      metadata: { error }
    });
    return noStoreJson({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { pool } from '../../lib/db';
import TabSavings from '../components/TabSavings';
import Footer from '../components/Footer';

function summary(row: Record<string, unknown> | undefined) {
  return {
    runs: Number(row?.runs || 0),
    energyKwh: Number(row?.energy_kwh || 0),
    actualCostPln: Number(row?.actual_cost_pln || 0),
    referenceCostPln: Number(row?.reference_cost_pln || 0),
    savingsPln: Number(row?.savings_pln || 0),
    estimatedRuns: Number(row?.estimated_runs || 0)
  };
}

const EMPTY_DATA: any = {
  allTime: summary(undefined),
  month: summary(undefined),
  devices: [],
  daily: [],
  reports: [],
  executions: []
};

export default async function SavingsPage() {
  const { userId } = auth();
  let isPremiumUser = false;
  let data: any = EMPTY_DATA;
  let loadError: string | null = null;

  if (userId) {
    try {
      const subscriptionResult = await pool.query(
        `SELECT is_active, current_period_end
         FROM user_subscriptions
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );
      const subscription = subscriptionResult.rows[0];
      const expired = subscription?.current_period_end
        && new Date(subscription.current_period_end) < new Date();
      isPremiumUser = Boolean(subscription?.is_active && !expired);

      if (isPremiumUser) {
        const [allTimeResult, monthResult, devicesResult, dailyResult, reportsResult, executionsResult] = await Promise.all([
          pool.query(
            `SELECT COUNT(*)::int AS runs,
                    COALESCE(SUM(energy_kwh), 0) AS energy_kwh,
                    COALESCE(SUM(actual_market_cost_pln), 0) AS actual_cost_pln,
                    COALESCE(SUM(reference_cost_pln), 0) AS reference_cost_pln,
                    COALESCE(SUM(savings_pln), 0) AS savings_pln,
                    COUNT(*) FILTER (WHERE metadata->>'energy_estimated' = 'true')::int AS estimated_runs
             FROM energy_savings_reports
             WHERE user_id = $1`,
            [userId]
          ),
          pool.query(
            `SELECT COUNT(*)::int AS runs,
                    COALESCE(SUM(energy_kwh), 0) AS energy_kwh,
                    COALESCE(SUM(actual_market_cost_pln), 0) AS actual_cost_pln,
                    COALESCE(SUM(reference_cost_pln), 0) AS reference_cost_pln,
                    COALESCE(SUM(savings_pln), 0) AS savings_pln,
                    COUNT(*) FILTER (WHERE metadata->>'energy_estimated' = 'true')::int AS estimated_runs
             FROM energy_savings_reports
             WHERE user_id = $1
               AND started_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Europe/Warsaw') AT TIME ZONE 'Europe/Warsaw'`,
            [userId]
          ),
          pool.query(
            `SELECT device_name,
                    COUNT(*)::int AS runs,
                    COALESCE(SUM(energy_kwh), 0) AS energy_kwh,
                    COALESCE(SUM(actual_market_cost_pln), 0) AS actual_cost_pln,
                    COALESCE(SUM(reference_cost_pln), 0) AS reference_cost_pln,
                    COALESCE(SUM(savings_pln), 0) AS savings_pln,
                    COUNT(*) FILTER (WHERE metadata->>'energy_estimated' = 'true')::int AS estimated_runs
             FROM energy_savings_reports
             WHERE user_id = $1
             GROUP BY device_name
             ORDER BY SUM(savings_pln) DESC
             LIMIT 20`,
            [userId]
          ),
          pool.query(
            `SELECT TO_CHAR(started_at AT TIME ZONE 'Europe/Warsaw', 'YYYY-MM-DD') AS date,
                    COUNT(*)::int AS runs,
                    COALESCE(SUM(energy_kwh), 0) AS energy_kwh,
                    COALESCE(SUM(savings_pln), 0) AS savings_pln
             FROM energy_savings_reports
             WHERE user_id = $1
               AND started_at >= NOW() - INTERVAL '30 days'
             GROUP BY TO_CHAR(started_at AT TIME ZONE 'Europe/Warsaw', 'YYYY-MM-DD')
             ORDER BY date ASC`,
            [userId]
          ),
          pool.query(
            `SELECT id, device_name, started_at, ended_at, energy_kwh,
                    average_market_price_pln_kwh, actual_market_cost_pln,
                    reference_cost_pln, savings_pln, metadata
             FROM energy_savings_reports
             WHERE user_id = $1
             ORDER BY started_at DESC
             LIMIT 50`,
            [userId]
          ),
          pool.query(
            `SELECT execution_id, device_name, status, started_at, ended_at,
                    energy_kwh, energy_source
             FROM energy_device_executions
             WHERE user_id = $1
               AND status IN ('running', 'awaiting_prices')
             ORDER BY started_at DESC`,
            [userId]
          )
        ]);

        data = {
          allTime: summary(allTimeResult.rows[0]),
          month: summary(monthResult.rows[0]),
          devices: devicesResult.rows.map((row: Record<string, unknown>) => ({
            ...summary(row),
            deviceName: String(row.device_name)
          })),
          daily: dailyResult.rows.map((row: Record<string, unknown>) => ({
            date: String(row.date),
            runs: Number(row.runs || 0),
            energyKwh: Number(row.energy_kwh || 0),
            savingsPln: Number(row.savings_pln || 0)
          })),
          reports: reportsResult.rows.map((row: Record<string, any>) => ({
            id: row.id,
            deviceName: String(row.device_name),
            startedAt: row.started_at,
            endedAt: row.ended_at,
            energyKwh: Number(row.energy_kwh || 0),
            actualCostPln: Number(row.actual_market_cost_pln || 0),
            referenceCostPln: Number(row.reference_cost_pln || 0),
            savingsPln: Number(row.savings_pln || 0),
            averagePricePlnKwh: Number(row.average_market_price_pln_kwh || 0),
            energySource: row.metadata?.energy_source || null,
            estimated: row.metadata?.energy_estimated === true
          })),
          executions: executionsResult.rows.map((row: Record<string, any>) => ({
            executionId: String(row.execution_id),
            deviceName: String(row.device_name),
            status: String(row.status),
            startedAt: row.started_at,
            endedAt: row.ended_at,
            energyKwh: row.energy_kwh === null ? null : Number(row.energy_kwh),
            energySource: row.energy_source || null
          }))
        };
      }
    } catch (error) {
      loadError = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="font-black tracking-tight text-slate-900">⚡ EnergyOptimizer</Link>
          <Link href="/" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">← Dashboard</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <TabSavings isPremiumUser={isPremiumUser} data={data} loadError={loadError} />
      </main>
      <Footer />
    </div>
  );
}

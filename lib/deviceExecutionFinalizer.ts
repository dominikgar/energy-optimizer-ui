import { pool } from './db';
import { recordAppEvent } from './appEvents';
import { prepareAwaitingExecutionFinalization } from './deviceExecutionFinalizationModel';

interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[];
}

interface QueryClient {
  query<Row = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>;
  release(): void;
}

interface AwaitingExecutionRow {
  id: string | number;
  execution_id: string;
  user_id: string;
  device_name: string;
  started_at: Date | string;
  ended_at: Date | string;
  reference_rate_pln_kwh: number | string;
  energy_kwh: number | string;
  energy_source: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
}

export interface FinalizeAwaitingExecutionsOptions {
  userId?: string | null;
  limit?: number;
  requestId?: string | null;
}

export interface FinalizeAwaitingExecutionsResult {
  attempted: number;
  completed: number;
  awaitingPrices: number;
  skipped: number;
  failed: number;
}

type FinalizationAttempt =
  | { status: 'completed' }
  | { status: 'awaiting_prices' }
  | { status: 'skipped' }
  | { status: 'failed' };

function safeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function boundedLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(100, Math.trunc(value as number)));
}

async function markFinalizationFailure(
  client: QueryClient,
  executionId: string | number,
  error: string
): Promise<void> {
  await client.query(
    `UPDATE energy_device_executions
     SET metadata = COALESCE(metadata, '{}'::jsonb)
           || jsonb_build_object(
                'finalization_error', $2::text,
                'finalization_failed_at', NOW()
              ),
         updated_at = NOW()
     WHERE id = $1`,
    [executionId, error]
  );
}

async function finalizeExecutionById(
  executionDbId: string | number,
  requestId?: string | null
): Promise<FinalizationAttempt> {
  const client = await pool.connect() as QueryClient;
  let execution: AwaitingExecutionRow | null = null;

  try {
    await client.query('BEGIN');

    const executionResult = await client.query<AwaitingExecutionRow>(
      `SELECT id, execution_id, user_id, device_name, started_at, ended_at,
              reference_rate_pln_kwh, energy_kwh, energy_source, source, metadata
       FROM energy_device_executions
       WHERE id = $1 AND status = 'awaiting_prices'
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [executionDbId]
    );

    execution = executionResult.rows[0] || null;
    if (!execution) {
      await client.query('ROLLBACK');
      return { status: 'skipped' };
    }

    const startedAt = new Date(execution.started_at);
    const endedAt = new Date(execution.ended_at);
    if (
      Number.isNaN(startedAt.getTime())
      || Number.isNaN(endedAt.getTime())
      || endedAt.getTime() <= startedAt.getTime()
    ) {
      const error = 'Cykl ma nieprawidłowy zakres czasu.';
      await markFinalizationFailure(client, execution.id, error);
      await client.query('COMMIT');
      await recordAppEvent({
        level: 'error',
        source: 'savings-execution',
        eventType: 'execution.finalization_failed',
        message: `Nie udało się automatycznie zakończyć cyklu ${execution.device_name}.`,
        userId: execution.user_id,
        requestId,
        metadata: {
          execution_id: execution.execution_id,
          error
        }
      });
      return { status: 'failed' };
    }

    const priceResult = await client.query<{
      average_price: number | string | null;
      sample_count: number | string;
    }>(
      `SELECT AVG(price_pln_mwh) / 1000.0 AS average_price,
              COUNT(*)::int AS sample_count
       FROM energy_prices
       WHERE timestamp >= $1 AND timestamp < $2`,
      [startedAt.toISOString(), endedAt.toISOString()]
    );

    const decision = prepareAwaitingExecutionFinalization({
      energyKwh: execution.energy_kwh,
      referenceRatePlnKwh: execution.reference_rate_pln_kwh,
      averageMarketPricePlnKwh: priceResult.rows[0]?.average_price,
      sampleCount: priceResult.rows[0]?.sample_count
    });

    if (decision.status === 'awaiting_prices') {
      await client.query(
        `UPDATE energy_device_executions
         SET updated_at = NOW()
         WHERE id = $1`,
        [execution.id]
      );
      await client.query('COMMIT');
      return { status: 'awaiting_prices' };
    }

    if (decision.status === 'invalid') {
      await markFinalizationFailure(client, execution.id, decision.error);
      await client.query('COMMIT');
      await recordAppEvent({
        level: 'error',
        source: 'savings-execution',
        eventType: 'execution.finalization_failed',
        message: `Nie udało się automatycznie zakończyć cyklu ${execution.device_name}.`,
        userId: execution.user_id,
        requestId,
        metadata: {
          execution_id: execution.execution_id,
          error: decision.error
        }
      });
      return { status: 'failed' };
    }

    const reportMetadata = {
      ...safeMetadata(execution.metadata),
      execution_id: execution.execution_id,
      energy_source: execution.energy_source,
      energy_estimated: execution.energy_source === 'power_duration',
      finalized_automatically: true
    };

    const savedReport = await client.query<{ id: string | number }>(
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
       RETURNING id`,
      [
        execution.user_id,
        execution.device_name,
        startedAt.toISOString(),
        endedAt.toISOString(),
        decision.energyKwh,
        decision.averageMarketPricePlnKwh,
        decision.actualMarketCostPln,
        decision.referenceRatePlnKwh,
        decision.referenceCostPln,
        decision.savingsPln,
        execution.source,
        JSON.stringify(reportMetadata)
      ]
    );

    await client.query(
      `UPDATE energy_device_executions
       SET status = 'completed',
           savings_report_id = $2,
           metadata = metadata - 'finalization_error' - 'finalization_failed_at',
           updated_at = NOW()
       WHERE id = $1 AND status = 'awaiting_prices'`,
      [execution.id, savedReport.rows[0].id]
    );

    await client.query('COMMIT');

    await recordAppEvent({
      level: 'info',
      source: 'savings-execution',
      eventType: 'execution.auto_completed',
      message: `Automatycznie zakończono cykl urządzenia ${execution.device_name}.`,
      userId: execution.user_id,
      requestId,
      metadata: {
        execution_id: execution.execution_id,
        device_name: execution.device_name,
        energy_kwh: decision.energyKwh,
        energy_source: execution.energy_source,
        savings_pln: decision.savingsPln
      }
    });

    return { status: 'completed' };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The original database error is more useful than a rollback failure.
    }

    await recordAppEvent({
      level: 'error',
      source: 'savings-execution',
      eventType: 'execution.finalization_failed',
      message: 'Automatyczna finalizacja cyklu urządzenia zakończyła się błędem.',
      userId: execution?.user_id || null,
      requestId,
      metadata: {
        execution_id: execution?.execution_id || null,
        error
      }
    });

    return { status: 'failed' };
  } finally {
    client.release();
  }
}

export async function finalizeAwaitingExecutions(
  options: FinalizeAwaitingExecutionsOptions = {}
): Promise<FinalizeAwaitingExecutionsResult> {
  const limit = boundedLimit(options.limit);
  const candidates = await pool.query(
    `SELECT id
     FROM energy_device_executions
     WHERE status = 'awaiting_prices'
       AND ended_at IS NOT NULL
       AND energy_kwh IS NOT NULL
       AND updated_at <= NOW() - INTERVAL '5 minutes'
       AND ($1::text IS NULL OR user_id = $1)
     ORDER BY updated_at ASC, id ASC
     LIMIT $2`,
    [options.userId || null, limit]
  ) as QueryResult<{ id: string | number }>;

  const result: FinalizeAwaitingExecutionsResult = {
    attempted: candidates.rows.length,
    completed: 0,
    awaitingPrices: 0,
    skipped: 0,
    failed: 0
  };

  for (const candidate of candidates.rows) {
    const attempt = await finalizeExecutionById(candidate.id, options.requestId);
    if (attempt.status === 'completed') result.completed += 1;
    else if (attempt.status === 'awaiting_prices') result.awaitingPrices += 1;
    else if (attempt.status === 'skipped') result.skipped += 1;
    else result.failed += 1;
  }

  return result;
}

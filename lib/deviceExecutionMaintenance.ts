import { recordAppEvent } from './appEvents';
import { pool } from './db';
import { resolveMaxRunningHours } from './deviceExecutionLifecycle';

export interface CancelStaleRunningExecutionsOptions {
  userId?: string | null;
  limit?: number;
  requestId?: string | null;
  maxRunningHours?: number;
}

export interface CancelStaleRunningExecutionsResult {
  scanned: number;
  cancelled: number;
  maxRunningHours: number;
}

interface CancelledExecutionRow {
  execution_id: string;
  user_id: string;
  device_name: string;
  started_at: Date | string;
  ended_at: Date | string;
}

function boundedLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(100, Math.trunc(value as number)));
}

export async function cancelStaleRunningExecutions(
  options: CancelStaleRunningExecutionsOptions = {}
): Promise<CancelStaleRunningExecutionsResult> {
  const maxRunningHours = resolveMaxRunningHours(
    options.maxRunningHours ?? process.env.EXECUTION_MAX_RUNNING_HOURS
  );
  const limit = boundedLimit(options.limit);
  const reason = `Automatycznie anulowano cykl aktywny dłużej niż ${maxRunningHours} godzin.`;

  const result = await pool.query(
    `WITH candidates AS (
       SELECT id
       FROM energy_device_executions
       WHERE status = 'running'
         AND started_at <= NOW() - ($1::int * INTERVAL '1 hour')
         AND ($2::text IS NULL OR user_id = $2)
       ORDER BY started_at ASC, id ASC
       LIMIT $3
       FOR UPDATE SKIP LOCKED
     )
     UPDATE energy_device_executions AS execution
     SET status = 'cancelled',
         ended_at = COALESCE(execution.ended_at, NOW()),
         metadata = COALESCE(execution.metadata, '{}'::jsonb)
           || jsonb_build_object(
                'cancellation_reason', $4::text,
                'cancelled_automatically', true,
                'cancelled_at', NOW()
              ),
         updated_at = NOW()
     FROM candidates
     WHERE execution.id = candidates.id
     RETURNING execution.execution_id, execution.user_id, execution.device_name,
               execution.started_at, execution.ended_at`,
    [maxRunningHours, options.userId || null, limit, reason]
  );

  const cancelledExecutions = result.rows as CancelledExecutionRow[];
  for (const execution of cancelledExecutions) {
    await recordAppEvent({
      level: 'warning',
      source: 'savings-execution',
      eventType: 'execution.auto_cancelled',
      message: `Automatycznie anulowano zbyt długi cykl urządzenia ${execution.device_name}.`,
      userId: execution.user_id,
      requestId: options.requestId,
      metadata: {
        execution_id: execution.execution_id,
        device_name: execution.device_name,
        started_at: execution.started_at,
        ended_at: execution.ended_at,
        max_running_hours: maxRunningHours
      }
    });
  }

  return {
    scanned: cancelledExecutions.length,
    cancelled: cancelledExecutions.length,
    maxRunningHours
  };
}

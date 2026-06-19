BEGIN;

CREATE INDEX IF NOT EXISTS energy_device_executions_awaiting_retry_idx
  ON public.energy_device_executions (updated_at, id)
  WHERE status = 'awaiting_prices';

COMMIT;

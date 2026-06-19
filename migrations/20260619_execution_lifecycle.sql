BEGIN;

CREATE INDEX IF NOT EXISTS energy_device_executions_running_started_idx
  ON public.energy_device_executions (started_at, id)
  WHERE status = 'running';

COMMIT;

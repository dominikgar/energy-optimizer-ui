BEGIN;

CREATE TABLE IF NOT EXISTS public.energy_device_executions (
  id BIGSERIAL PRIMARY KEY,
  execution_id UUID NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'awaiting_prices', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  reference_rate_pln_kwh DOUBLE PRECISION NOT NULL,
  meter_start_kwh DOUBLE PRECISION,
  meter_end_kwh DOUBLE PRECISION,
  reported_energy_kwh DOUBLE PRECISION,
  estimated_power_kw DOUBLE PRECISION,
  energy_kwh DOUBLE PRECISION,
  energy_source TEXT
    CHECK (energy_source IS NULL OR energy_source IN ('reported', 'meter_delta', 'power_duration')),
  savings_report_id BIGINT REFERENCES public.energy_savings_reports(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'home_assistant',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS energy_device_executions_one_running_idx
  ON public.energy_device_executions (user_id, device_name)
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS energy_device_executions_user_started_idx
  ON public.energy_device_executions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS energy_device_executions_user_status_idx
  ON public.energy_device_executions (user_id, status, started_at DESC);

COMMIT;

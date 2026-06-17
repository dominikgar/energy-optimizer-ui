BEGIN;

CREATE TABLE IF NOT EXISTS public.energy_savings_reports (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  energy_kwh DOUBLE PRECISION NOT NULL,
  average_market_price_pln_kwh DOUBLE PRECISION NOT NULL,
  actual_market_cost_pln DOUBLE PRECISION NOT NULL,
  reference_rate_pln_kwh DOUBLE PRECISION NOT NULL,
  reference_cost_pln DOUBLE PRECISION NOT NULL,
  savings_pln DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'home_assistant',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, device_name, started_at, ended_at)
);

CREATE INDEX IF NOT EXISTS energy_savings_reports_user_started_idx
  ON public.energy_savings_reports (user_id, started_at DESC);

COMMIT;

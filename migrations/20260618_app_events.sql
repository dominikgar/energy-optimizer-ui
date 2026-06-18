BEGIN;

CREATE TABLE IF NOT EXISTS app_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id TEXT,
  request_id TEXT,
  fingerprint TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS app_events_created_at_idx
  ON app_events (created_at DESC);

CREATE INDEX IF NOT EXISTS app_events_level_created_at_idx
  ON app_events (level, created_at DESC);

CREATE INDEX IF NOT EXISTS app_events_source_created_at_idx
  ON app_events (source, created_at DESC);

CREATE INDEX IF NOT EXISTS app_events_user_created_at_idx
  ON app_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_events_unresolved_idx
  ON app_events (created_at DESC)
  WHERE resolved_at IS NULL AND level IN ('error', 'critical');

COMMIT;

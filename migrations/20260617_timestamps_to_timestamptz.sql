BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';
SET LOCAL TIME ZONE 'Europe/Warsaw';

DO $$
DECLARE
  consumption_type text;
  prices_type text;
BEGIN
  SELECT data_type
    INTO consumption_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'energy_consumption'
    AND column_name = 'timestamp';

  IF consumption_type IS NULL THEN
    RAISE EXCEPTION 'Brak kolumny public.energy_consumption.timestamp';
  ELSIF consumption_type = 'timestamp without time zone' THEN
    ALTER TABLE public.energy_consumption
      ALTER COLUMN timestamp TYPE timestamptz
      USING timestamp AT TIME ZONE 'Europe/Warsaw';
  ELSIF consumption_type <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'Nieoczekiwany typ energy_consumption.timestamp: %', consumption_type;
  END IF;

  SELECT data_type
    INTO prices_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'energy_prices'
    AND column_name = 'timestamp';

  IF prices_type IS NULL THEN
    RAISE EXCEPTION 'Brak kolumny public.energy_prices.timestamp';
  ELSIF prices_type = 'timestamp without time zone' THEN
    ALTER TABLE public.energy_prices
      ALTER COLUMN timestamp TYPE timestamptz
      USING timestamp AT TIME ZONE 'Europe/Warsaw';
  ELSIF prices_type <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'Nieoczekiwany typ energy_prices.timestamp: %', prices_type;
  END IF;
END $$;

COMMENT ON COLUMN public.energy_consumption.timestamp IS
  'Bezwzględny moment czasu; dane źródłowe interpretowane w Europe/Warsaw.';

COMMENT ON COLUMN public.energy_prices.timestamp IS
  'Bezwzględny moment czasu; okresy PSE interpretowane w Europe/Warsaw.';

COMMIT;

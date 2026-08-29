// @ts-ignore
import { Pool } from 'pg';

const globalForPg = globalThis as typeof globalThis & {
  energyOptimizerPool?: any;
};

export const pool = globalForPg.energyOptimizerPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  options: '-c timezone=Europe/Warsaw',
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: true
});

// Reuse the same small pool whenever a warm serverless runtime handles
// multiple requests. This avoids multiplying idle Neon connections.
globalForPg.energyOptimizerPool = pool;

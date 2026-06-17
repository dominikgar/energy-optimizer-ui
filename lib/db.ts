// @ts-ignore
import { Pool } from 'pg';

const globalForPg = globalThis as typeof globalThis & {
  energyOptimizerPool?: any;
};

export const pool = globalForPg.energyOptimizerPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  options: '-c timezone=Europe/Warsaw'
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.energyOptimizerPool = pool;
}

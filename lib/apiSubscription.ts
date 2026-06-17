// @ts-ignore
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export interface ApiSubscriptionAuth {
  ok: boolean;
  status: number;
  error: string | null;
  userId: string | null;
}

export async function authenticateApiSubscription(request: Request): Promise<ApiSubscriptionAuth> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      error: 'Brak autoryzacji.',
      userId: null
    };
  }

  const token = header.slice(7).trim();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Brak tokenu Bearer.',
      userId: null
    };
  }

  const { rows } = await pool.query(
    `SELECT user_id, is_active, current_period_end
     FROM user_subscriptions
     WHERE api_key = $1
     LIMIT 1`,
    [token]
  );

  const subscription = rows[0];
  const expired = subscription?.current_period_end
    && new Date(subscription.current_period_end) < new Date();

  if (!subscription?.is_active || expired) {
    return {
      ok: false,
      status: 403,
      error: 'Nieprawidłowy klucz lub brak aktywnej subskrypcji PRO.',
      userId: null
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    userId: subscription.user_id ?? null
  };
}

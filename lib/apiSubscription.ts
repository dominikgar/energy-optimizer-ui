import { pool } from './db';
import {
  accessTokenPrefix,
  consumeAccessTokenRateLimit,
  digestAccessToken
} from './accessTokens';

export interface ApiSubscriptionAuth {
  ok: boolean;
  status: number;
  error: string | null;
  userId: string | null;
}

export async function authenticateApiSubscription(request: Request): Promise<ApiSubscriptionAuth> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Brak autoryzacji.', userId: null };
  }

  const token = header.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Brak tokenu Bearer.', userId: null };
  }

  const digest = digestAccessToken(token);
  const { rows } = await pool.query(
    `SELECT user_id, is_active, current_period_end,
            access_token_digest, api_key
     FROM user_subscriptions
     WHERE access_token_digest = $1 OR api_key = $2
     LIMIT 1`,
    [digest, token]
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

  const rateLimit = consumeAccessTokenRateLimit(digest);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      status: 429,
      error: 'Przekroczono limit 120 zapytań w ciągu 5 minut.',
      userId: null
    };
  }

  if (!subscription.access_token_digest && subscription.api_key === token) {
    await pool.query(
      `UPDATE user_subscriptions
       SET access_token_digest = $2,
           access_token_prefix = $3,
           access_token_created_at = COALESCE(access_token_created_at, NOW()),
           access_token_last_used_at = NOW()
       WHERE user_id = $1 AND access_token_digest IS NULL`,
      [subscription.user_id, digest, accessTokenPrefix(token)]
    );
  } else {
    await pool.query(
      `UPDATE user_subscriptions
       SET access_token_last_used_at = NOW()
       WHERE user_id = $1
         AND (
           access_token_last_used_at IS NULL
           OR access_token_last_used_at < NOW() - INTERVAL '15 minutes'
         )`,
      [subscription.user_id]
    );
  }

  return {
    ok: true,
    status: 200,
    error: null,
    userId: subscription.user_id ?? null
  };
}

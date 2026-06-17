import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pool } from '../../../lib/db';
import {
  accessTokenPrefix,
  digestAccessToken,
  generateAccessToken
} from '../../../lib/accessTokens';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

async function getSubscription(userId: string) {
  const { rows } = await pool.query(
    `SELECT is_active, current_period_end, api_key,
            access_token_prefix, access_token_created_at,
            access_token_last_used_at
     FROM user_subscriptions
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

function isActive(subscription: any): boolean {
  if (!subscription?.is_active) return false;
  return !subscription.current_period_end
    || new Date(subscription.current_period_end) >= new Date();
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return noStoreJson({ error: 'Brak autoryzacji.' }, 401);

  const subscription = await getSubscription(userId);
  if (!isActive(subscription)) {
    return noStoreJson({ error: 'Funkcja wymaga aktywnej subskrypcji PRO.' }, 403);
  }

  return noStoreJson({
    status: 'success',
    mode: subscription.access_token_prefix
      ? 'hashed'
      : subscription.api_key
        ? 'legacy'
        : 'none',
    legacy_token: subscription.access_token_prefix ? null : subscription.api_key,
    prefix: subscription.access_token_prefix
      || (subscription.api_key ? accessTokenPrefix(subscription.api_key) : null),
    created_at: subscription.access_token_created_at,
    last_used_at: subscription.access_token_last_used_at
  });
}

export async function POST() {
  const { userId } = auth();
  if (!userId) return noStoreJson({ error: 'Brak autoryzacji.' }, 401);

  const subscription = await getSubscription(userId);
  if (!isActive(subscription)) {
    return noStoreJson({ error: 'Funkcja wymaga aktywnej subskrypcji PRO.' }, 403);
  }

  const token = generateAccessToken();
  const digest = digestAccessToken(token);
  const prefix = accessTokenPrefix(token);

  await pool.query(
    `UPDATE user_subscriptions
     SET api_key = NULL,
         access_token_digest = $2,
         access_token_prefix = $3,
         access_token_created_at = NOW(),
         access_token_last_used_at = NULL
     WHERE user_id = $1`,
    [userId, digest, prefix]
  );

  return noStoreJson({
    status: 'success',
    token,
    prefix,
    warning: 'Skopiuj token teraz. Po zamknięciu tej strony nie będzie można go ponownie wyświetlić.'
  });
}

export async function DELETE() {
  const { userId } = auth();
  if (!userId) return noStoreJson({ error: 'Brak autoryzacji.' }, 401);

  await pool.query(
    `UPDATE user_subscriptions
     SET api_key = NULL,
         access_token_digest = NULL,
         access_token_prefix = NULL,
         access_token_created_at = NULL,
         access_token_last_used_at = NULL
     WHERE user_id = $1`,
    [userId]
  );

  return noStoreJson({ status: 'success', revoked: true });
}

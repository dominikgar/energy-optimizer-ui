import crypto from 'crypto';

const TOKEN_PREFIX = 'eo_live_';
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 120;

interface RateLimitEntry {
  windowStartedAt: number;
  count: number;
}

const globalForTokens = globalThis as typeof globalThis & {
  energyOptimizerRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimits = globalForTokens.energyOptimizerRateLimits ?? new Map<string, RateLimitEntry>();
globalForTokens.energyOptimizerRateLimits = rateLimits;

export function generateAccessToken(): string {
  return `${TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
}

export function digestAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function accessTokenPrefix(token: string): string {
  return `${token.slice(0, TOKEN_PREFIX.length + 8)}…`;
}

export function consumeAccessTokenRateLimit(
  digest: string,
  now = Date.now()
): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
  const existing = rateLimits.get(digest);
  const expired = !existing || now - existing.windowStartedAt >= RATE_LIMIT_WINDOW_MS;
  const entry = expired ? { windowStartedAt: now, count: 0 } : existing;

  entry.count += 1;
  rateLimits.set(digest, entry);

  if (rateLimits.size > 5000) {
    for (const [key, value] of rateLimits) {
      if (now - value.windowStartedAt >= RATE_LIMIT_WINDOW_MS) rateLimits.delete(key);
    }
  }

  return {
    allowed: entry.count <= RATE_LIMIT_MAX_REQUESTS,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count),
    resetAt: entry.windowStartedAt + RATE_LIMIT_WINDOW_MS
  };
}

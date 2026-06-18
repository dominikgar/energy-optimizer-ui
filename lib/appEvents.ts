import { createHash, randomUUID } from 'node:crypto';
import { pool } from './db';

export type AppEventLevel = 'info' | 'warning' | 'error' | 'critical';

export interface AppEventInput {
  level: AppEventLevel;
  source: string;
  eventType: string;
  message: string;
  userId?: string | null;
  requestId?: string | null;
  fingerprint?: string | null;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY = /(authorization|token|secret|password|api[_-]?key|signature|cookie)/i;
const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_LENGTH = 30;
const MAX_OBJECT_KEYS = 40;
const MAX_DEPTH = 5;

function truncate(value: string, maximum = MAX_STRING_LENGTH): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum)}…`;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[max-depth]';
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: truncate(value.name, 120),
      message: truncate(value.message)
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([key, item]) => [
          key,
          SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeValue(item, depth + 1)
        ])
    );
  }
  return truncate(String(value));
}

export function sanitizeEventMetadata(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  return sanitizeValue(metadata, 0) as Record<string, unknown>;
}

export function eventFingerprint(source: string, eventType: string, message: string): string {
  return createHash('sha256')
    .update(`${source}:${eventType}:${message}`)
    .digest('hex')
    .slice(0, 32);
}

export function createRequestId(request?: Request): string {
  return request?.headers.get('x-request-id')
    || request?.headers.get('x-vercel-id')
    || randomUUID();
}

export async function recordAppEvent(input: AppEventInput): Promise<boolean> {
  const source = truncate(input.source.trim() || 'unknown', 120);
  const eventType = truncate(input.eventType.trim() || 'unknown', 160);
  const message = truncate(input.message.trim() || 'Brak opisu zdarzenia.', 2000);
  const metadata = sanitizeEventMetadata(input.metadata);
  const fingerprint = input.fingerprint
    || eventFingerprint(source, eventType, message);

  try {
    await pool.query(
      `INSERT INTO app_events
        (level, source, event_type, message, user_id, request_id, fingerprint, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        input.level,
        source,
        eventType,
        message,
        input.userId || null,
        input.requestId || null,
        fingerprint,
        JSON.stringify(metadata)
      ]
    );
    return true;
  } catch (error) {
    console.error('Application event could not be persisted:', {
      source,
      eventType,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

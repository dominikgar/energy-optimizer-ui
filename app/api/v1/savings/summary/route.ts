/Users/dominik/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew
/Users/dominik/.zprofile:2: no such file or directory: /opt/homebrew/bin/brew
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from '../../../../../lib/apiSubscription';
import { createRequestId, recordAppEvent } from '../../../../../lib/appEvents';
import { versionApiPayload } from '../../../../../lib/apiContract';
import { getSavingsSummary } from '../../../../../lib/savingsSummary';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(versionApiPayload(body, status), { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  if (status === 429) response.headers.set('Retry-After', '300');
  return response;
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request);

  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok || !auth.userId) {
      return noStoreJson({ error: auth.error }, auth.status);
    }

    return noStoreJson(await getSavingsSummary(auth.userId));
  } catch (error) {
    console.error('Savings summary API error:', error);
    await recordAppEvent({
      level: 'error',
      source: 'savings-summary',
      eventType: 'summary.failed',
      message: 'Nie udało się przygotować podsumowania oszczędności dla Home Assistanta.',
      requestId,
      metadata: { error }
    });
    return noStoreJson({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

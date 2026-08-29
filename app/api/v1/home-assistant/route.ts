/Users/dominik/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew
/Users/dominik/.zprofile:2: no such file or directory: /opt/homebrew/bin/brew
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from '../../../../lib/apiSubscription';
import { versionApiPayload } from '../../../../lib/apiContract';
import { handleAuthenticatedDeviceScheduleRequest } from '../../../../lib/deviceScheduleApiV2';
import { getSavingsSummary } from '../../../../lib/savingsSummary';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(versionApiPayload(body, status), { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  if (status === 429) response.headers.set('Retry-After', '300');
  return response;
}

/**
 * Home Assistant's polling endpoint. It authenticates once, returns both
 * payloads and reuses the summary cache for data that changes infrequently.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok || !auth.userId) return noStoreJson({ error: auth.error }, auth.status);

    const [scheduleResponse, summary] = await Promise.all([
      handleAuthenticatedDeviceScheduleRequest(request),
      getSavingsSummary(auth.userId)
    ]);
    const schedule = await scheduleResponse.json();

    if (scheduleResponse.status >= 400) return noStoreJson(schedule, scheduleResponse.status);
    return noStoreJson({ status: 'success', schedule, summary });
  } catch (error) {
    console.error('Home Assistant aggregate API error:', error);
    return noStoreJson({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

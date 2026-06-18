import { NextRequest } from 'next/server';
import { handleDeviceScheduleRequest } from '../../../../../lib/deviceScheduleApi';
import { createRequestId, recordAppEvent } from '../../../../../lib/appEvents';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId(request);
  const response = await handleDeviceScheduleRequest(request);

  let responseBody: Record<string, unknown> = {};
  try {
    responseBody = await response.clone().json();
  } catch {
    responseBody = {};
  }

  const status = response.status;
  const level = status >= 500 ? 'error' : status >= 400 ? 'warning' : 'info';
  const deviceName = request.nextUrl.searchParams.get('device_name') || 'device';
  const eventType = typeof responseBody.status === 'string'
    ? `schedule.${responseBody.status}`
    : `http.${status}`;

  await recordAppEvent({
    level,
    source: 'device-api',
    eventType,
    message: typeof responseBody.error === 'string'
      ? responseBody.error
      : `Wyliczono harmonogram urządzenia ${deviceName}.`,
    requestId,
    metadata: {
      http_status: status,
      duration_ms: Date.now() - startedAt,
      device_name: deviceName.slice(0, 80),
      day: request.nextUrl.searchParams.get('day') || 'today',
      earliest_start: request.nextUrl.searchParams.get('earliest_start'),
      latest_end: request.nextUrl.searchParams.get('latest_end'),
      contiguous: request.nextUrl.searchParams.get('contiguous')
    }
  });

  return response;
}

import { NextRequest, NextResponse } from 'next/server';
import { handleDeviceExecutionRequest } from '../../../../../lib/deviceExecutionApi';
import { versionApiPayload } from '../../../../../lib/apiContract';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const response = await handleDeviceExecutionRequest(request);
  let body: unknown = {};
  try {
    body = await response.clone().json();
  } catch {
    return response;
  }

  const versioned = NextResponse.json(versionApiPayload(body, response.status), {
    status: response.status
  });
  versioned.headers.set('Cache-Control', 'private, no-store, max-age=0');
  if (response.status === 429) versioned.headers.set('Retry-After', '300');
  return versioned;
}

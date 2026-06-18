import { NextRequest } from 'next/server';
import { handleDeviceExecutionRequest } from '../../../../../lib/deviceExecutionApi';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return handleDeviceExecutionRequest(request);
}

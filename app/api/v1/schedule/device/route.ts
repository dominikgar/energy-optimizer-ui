import { NextRequest } from 'next/server';
import { handleDeviceScheduleRequest } from '../../../../../lib/deviceScheduleApi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleDeviceScheduleRequest(request);
}

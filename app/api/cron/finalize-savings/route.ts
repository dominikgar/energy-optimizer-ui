import { NextRequest, NextResponse } from 'next/server';
import { createRequestId, recordAppEvent } from '../../../../lib/appEvents';
import { finalizeAwaitingExecutions } from '../../../../lib/deviceExecutionFinalizer';
import { cancelStaleRunningExecutions } from '../../../../lib/deviceExecutionMaintenance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function noStoreJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request);
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return noStoreJson({ error: 'Unauthorized' }, 401);
  }

  try {
    const staleRunning = await cancelStaleRunningExecutions({
      limit: 50,
      requestId
    });
    const awaitingPrices = await finalizeAwaitingExecutions({
      limit: 50,
      requestId
    });

    return noStoreJson({
      status: 'success',
      stale_running: staleRunning,
      awaiting_prices: awaitingPrices
    });
  } catch (error) {
    console.error('Savings lifecycle cron error:', error);
    await recordAppEvent({
      level: 'critical',
      source: 'savings-execution',
      eventType: 'execution.maintenance_batch_failed',
      message: 'Nie udało się uruchomić automatycznej obsługi cykli urządzeń.',
      requestId,
      metadata: { error }
    });

    return noStoreJson({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

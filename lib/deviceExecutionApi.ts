import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiSubscription } from './apiSubscription';
import { pool } from './db';
import { calculateRealizedSavings } from './realizedSavings';
import { resolveExecutionEnergy } from './deviceExecutionEnergy';
import {
  createRequestId,
  recordAppEvent,
  sanitizeEventMetadata
} from './appEvents';

function noStoreJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

function parseFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string'
    ? Number(value.replace(',', '.'))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: unknown, fallback?: Date): Date | null {
  if (value === null || value === undefined || value === '') return fallback || null;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cleanDeviceName(value: unknown): string {
  return String(value || '').trim().slice(0, 80);
}

function cleanSource(value: unknown): string {
  return String(value || 'home_assistant').trim().slice(0, 40) || 'home_assistant';
}

function cleanMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return sanitizeEventMetadata(value as Record<string, unknown>);
}

async function startExecution(
  userId: string,
  body: Record<string, unknown>,
  requestId: string
): Promise<NextResponse> {
  const deviceName = cleanDeviceName(body.device_name);
  const startedAt = parseDate(body.started_at, new Date());
  const referenceRate = parseFiniteNumber(body.reference_rate_pln_kwh);
  const meterStart = parseFiniteNumber(body.meter_start_kwh);
  const powerKw = parseFiniteNumber(body.power_kw);
  const source = cleanSource(body.source);
  const metadata = cleanMetadata(body.metadata);

  if (!deviceName) return noStoreJson({ error: 'Brak parametru device_name.' }, 400);
  if (!startedAt) return noStoreJson({ error: 'started_at musi być poprawną datą ISO.' }, 400);
  if (startedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return noStoreJson({ error: 'started_at nie może wskazywać przyszłości.' }, 400);
  }
  if (referenceRate === null || referenceRate < 0 || referenceRate > 20) {
    return noStoreJson({ error: 'reference_rate_pln_kwh musi mieścić się w zakresie 0–20.' }, 400);
  }
  if (meterStart !== null && meterStart < 0) {
    return noStoreJson({ error: 'meter_start_kwh nie może być ujemne.' }, 400);
  }
  if (powerKw !== null && (powerKw <= 0 || powerKw > 100)) {
    return noStoreJson({ error: 'power_kw musi mieścić się w zakresie 0–100.' }, 400);
  }

  const executionId = randomUUID();

  try {
    const saved = await pool.query(
      `INSERT INTO energy_device_executions (
         execution_id, user_id, device_name, status, started_at,
         reference_rate_pln_kwh, meter_start_kwh, estimated_power_kw,
         source, metadata, updated_at
       ) VALUES ($1, $2, $3, 'running', $4, $5, $6, $7, $8, $9::jsonb, NOW())
       RETURNING execution_id, device_name, status, started_at,
                 reference_rate_pln_kwh, meter_start_kwh,
                 estimated_power_kw, source, created_at`,
      [
        executionId,
        userId,
        deviceName,
        startedAt.toISOString(),
        referenceRate,
        meterStart,
        powerKw,
        source,
        JSON.stringify(metadata)
      ]
    );

    await recordAppEvent({
      level: 'info',
      source: 'savings-execution',
      eventType: 'execution.started',
      message: `Rozpoczęto cykl urządzenia ${deviceName}.`,
      userId,
      requestId,
      metadata: {
        execution_id: executionId,
        device_name: deviceName,
        started_at: startedAt,
        has_meter_start: meterStart !== null,
        has_power_fallback: powerKw !== null
      }
    });

    return noStoreJson({ status: 'running', execution: saved.rows[0] }, 201);
  } catch (error: any) {
    if (error?.code === '23505') {
      const existing = await pool.query(
        `SELECT execution_id, device_name, status, started_at,
                reference_rate_pln_kwh, meter_start_kwh,
                estimated_power_kw, source, created_at
         FROM energy_device_executions
         WHERE user_id = $1 AND device_name = $2 AND status = 'running'
         ORDER BY started_at DESC
         LIMIT 1`,
        [userId, deviceName]
      );
      return noStoreJson({
        error: 'Dla tego urządzenia istnieje już aktywny cykl.',
        execution: existing.rows[0] || null
      }, 409);
    }
    throw error;
  }
}

async function stopExecution(
  userId: string,
  body: Record<string, unknown>,
  requestId: string
): Promise<NextResponse> {
  const executionId = String(body.execution_id || '').trim();
  const deviceName = cleanDeviceName(body.device_name);
  if (!executionId && !deviceName) {
    return noStoreJson({ error: 'Podaj execution_id albo device_name.' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const executionResult = executionId
      ? await client.query(
          `SELECT * FROM energy_device_executions
           WHERE user_id = $1 AND execution_id = $2
           LIMIT 1
           FOR UPDATE`,
          [userId, executionId]
        )
      : await client.query(
          `SELECT * FROM energy_device_executions
           WHERE user_id = $1 AND device_name = $2
             AND status IN ('running', 'awaiting_prices')
           ORDER BY started_at DESC
           LIMIT 1
           FOR UPDATE`,
          [userId, deviceName]
        );

    const execution = executionResult.rows[0];
    if (!execution) {
      await client.query('ROLLBACK');
      return noStoreJson({ error: 'Nie znaleziono aktywnego cyklu urządzenia.' }, 404);
    }

    if (execution.status === 'completed') {
      const report = await client.query(
        `SELECT * FROM energy_savings_reports WHERE id = $1 LIMIT 1`,
        [execution.savings_report_id]
      );
      await client.query('COMMIT');
      return noStoreJson({
        status: 'completed',
        idempotent: true,
        execution,
        report: report.rows[0] || null
      });
    }

    if (execution.status === 'cancelled') {
      await client.query('ROLLBACK');
      return noStoreJson({ error: 'Cykl został anulowany.' }, 409);
    }

    const endedAt = execution.ended_at
      ? new Date(execution.ended_at)
      : parseDate(body.ended_at, new Date());
    if (!endedAt) {
      await client.query('ROLLBACK');
      return noStoreJson({ error: 'ended_at musi być poprawną datą ISO.' }, 400);
    }

    const startedAt = new Date(execution.started_at);
    const durationHours = (endedAt.getTime() - startedAt.getTime()) / 3_600_000;
    const meterEnd = execution.meter_end_kwh ?? parseFiniteNumber(body.meter_end_kwh);
    const reportedEnergy = execution.reported_energy_kwh ?? parseFiniteNumber(body.energy_kwh);
    const powerKw = parseFiniteNumber(body.power_kw) ?? Number(execution.estimated_power_kw || 0) || null;

    const energy = execution.energy_kwh
      ? {
          valid: true,
          error: null,
          energyKwh: Number(execution.energy_kwh),
          source: execution.energy_source,
          estimated: execution.energy_source === 'power_duration'
        }
      : resolveExecutionEnergy({
          reportedEnergyKwh: reportedEnergy,
          meterStartKwh: execution.meter_start_kwh === null ? null : Number(execution.meter_start_kwh),
          meterEndKwh: meterEnd,
          powerKw,
          durationHours
        });

    if (!energy.valid || energy.energyKwh === null || !energy.source) {
      await client.query('ROLLBACK');
      return noStoreJson({ error: energy.error }, 400);
    }
    if (energy.energyKwh > 10_000) {
      await client.query('ROLLBACK');
      return noStoreJson({ error: 'Wyliczona energia nie może przekraczać 10000 kWh.' }, 400);
    }

    const mergedMetadata = {
      ...(execution.metadata || {}),
      ...cleanMetadata(body.metadata),
      energy_estimated: energy.estimated
    };

    await client.query(
      `UPDATE energy_device_executions
       SET status = 'awaiting_prices',
           ended_at = $2,
           meter_end_kwh = $3,
           reported_energy_kwh = $4,
           estimated_power_kw = COALESCE($5, estimated_power_kw),
           energy_kwh = $6,
           energy_source = $7,
           metadata = $8::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [
        execution.id,
        endedAt.toISOString(),
        meterEnd,
        reportedEnergy,
        powerKw,
        energy.energyKwh,
        energy.source,
        JSON.stringify(mergedMetadata)
      ]
    );

    const priceResult = await client.query(
      `SELECT AVG(price_pln_mwh) / 1000.0 AS average_price,
              COUNT(*)::int AS sample_count
       FROM energy_prices
       WHERE timestamp >= $1 AND timestamp < $2`,
      [startedAt.toISOString(), endedAt.toISOString()]
    );

    const averagePrice = Number(priceResult.rows[0]?.average_price);
    const sampleCount = Number(priceResult.rows[0]?.sample_count || 0);
    if (!Number.isFinite(averagePrice) || sampleCount === 0) {
      await client.query('COMMIT');
      await recordAppEvent({
        level: 'info',
        source: 'savings-execution',
        eventType: 'execution.awaiting_prices',
        message: `Cykl urządzenia ${execution.device_name} oczekuje na ceny PSE.`,
        userId,
        requestId,
        metadata: {
          execution_id: execution.execution_id,
          device_name: execution.device_name,
          started_at: startedAt,
          ended_at: endedAt,
          energy_kwh: energy.energyKwh,
          energy_source: energy.source
        }
      });
      return noStoreJson({
        status: 'awaiting_prices',
        retry_after_seconds: 300,
        execution: {
          execution_id: execution.execution_id,
          device_name: execution.device_name,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          energy_kwh: Number(energy.energyKwh.toFixed(4)),
          energy_source: energy.source,
          energy_estimated: energy.estimated
        }
      }, 202);
    }

    const savings = calculateRealizedSavings({
      energyKwh: energy.energyKwh,
      averageMarketPricePlnKwh: averagePrice,
      referenceRatePlnKwh: Number(execution.reference_rate_pln_kwh)
    });
    if (!savings.valid) {
      await client.query('ROLLBACK');
      return noStoreJson({ error: savings.error }, 400);
    }

    const reportMetadata = {
      ...mergedMetadata,
      execution_id: execution.execution_id,
      energy_source: energy.source,
      energy_estimated: energy.estimated
    };
    const savedReport = await client.query(
      `INSERT INTO energy_savings_reports (
         user_id, device_name, started_at, ended_at, energy_kwh,
         average_market_price_pln_kwh, actual_market_cost_pln,
         reference_rate_pln_kwh, reference_cost_pln, savings_pln,
         source, metadata, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
       ON CONFLICT (user_id, device_name, started_at, ended_at)
       DO UPDATE SET
         energy_kwh = EXCLUDED.energy_kwh,
         average_market_price_pln_kwh = EXCLUDED.average_market_price_pln_kwh,
         actual_market_cost_pln = EXCLUDED.actual_market_cost_pln,
         reference_rate_pln_kwh = EXCLUDED.reference_rate_pln_kwh,
         reference_cost_pln = EXCLUDED.reference_cost_pln,
         savings_pln = EXCLUDED.savings_pln,
         source = EXCLUDED.source,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        execution.device_name,
        startedAt.toISOString(),
        endedAt.toISOString(),
        energy.energyKwh,
        averagePrice,
        savings.actualMarketCostPln,
        Number(execution.reference_rate_pln_kwh),
        savings.referenceCostPln,
        savings.savingsPln,
        execution.source,
        JSON.stringify(reportMetadata)
      ]
    );

    await client.query(
      `UPDATE energy_device_executions
       SET status = 'completed', savings_report_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [execution.id, savedReport.rows[0].id]
    );
    await client.query('COMMIT');

    await recordAppEvent({
      level: 'info',
      source: 'savings-execution',
      eventType: 'execution.completed',
      message: `Zakończono cykl urządzenia ${execution.device_name}.`,
      userId,
      requestId,
      metadata: {
        execution_id: execution.execution_id,
        device_name: execution.device_name,
        duration_hours: durationHours,
        energy_kwh: energy.energyKwh,
        energy_source: energy.source,
        energy_estimated: energy.estimated,
        savings_pln: savings.savingsPln
      }
    });

    return noStoreJson({
      status: 'completed',
      execution: {
        execution_id: execution.execution_id,
        device_name: execution.device_name,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_hours: Number(durationHours.toFixed(3)),
        energy_kwh: Number(energy.energyKwh.toFixed(4)),
        energy_source: energy.source,
        energy_estimated: energy.estimated
      },
      report: savedReport.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function handleDeviceExecutionRequest(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId(request);
  try {
    const auth = await authenticateApiSubscription(request);
    if (!auth.ok || !auth.userId) {
      return noStoreJson({ error: auth.error }, auth.status);
    }

    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || '').trim().toLowerCase();
    if (action === 'start') return startExecution(auth.userId, body, requestId);
    if (action === 'stop') return stopExecution(auth.userId, body, requestId);
    return noStoreJson({ error: 'action musi mieć wartość start albo stop.' }, 400);
  } catch (error) {
    console.error('Savings execution API error:', error);
    await recordAppEvent({
      level: 'error',
      source: 'savings-execution',
      eventType: 'execution.failed',
      message: 'Nie udało się obsłużyć zdarzenia wykonania urządzenia.',
      requestId,
      metadata: { error }
    });
    return noStoreJson({ error: 'Wewnętrzny błąd serwera.' }, 500);
  }
}

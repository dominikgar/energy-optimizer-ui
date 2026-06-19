const test = require('node:test');
const assert = require('node:assert/strict');
const {
  API_VERSION,
  errorCodeForHttpStatus,
  versionApiPayload,
  validateApiErrorContract,
  validateScheduleContract,
  validateSavingsSummaryContract,
  validateExecutionContract
} = require('../lib/apiContract.ts');
const {
  buildSuccessPayload,
  buildUnfeasiblePayload
} = require('../lib/deviceSchedulePayloads.ts');
const { buildWaitingForPricesPayload } = require('../lib/waitingForPrices.ts');

function sharedScheduleInput() {
  return {
    generatedAt: new Date('2026-06-19T10:00:00.000Z'),
    timezone: 'Europe/Warsaw',
    baseDate: '2026-06-19',
    windowEndDate: '2026-06-19',
    day: 'today',
    deviceName: 'dishwasher',
    request: {
      energy_kwh: 1.5,
      power_kw: 1,
      earliest_start: '08:00',
      latest_end: '20:00',
      contiguous: true
    }
  };
}

test('adds API version and stable error codes without removing legacy fields', () => {
  const payload = versionApiPayload({ error: 'Brak autoryzacji.' }, 401);
  assert.equal(payload.api_version, API_VERSION);
  assert.equal(payload.status, 'error');
  assert.equal(payload.error, 'Brak autoryzacji.');
  assert.equal(payload.error_code, 'AUTHENTICATION_REQUIRED');
  assert.deepEqual(validateApiErrorContract(payload), []);
});

test('maps documented HTTP errors to stable codes', () => {
  assert.equal(errorCodeForHttpStatus(400), 'VALIDATION_ERROR');
  assert.equal(errorCodeForHttpStatus(401), 'AUTHENTICATION_REQUIRED');
  assert.equal(errorCodeForHttpStatus(403), 'SUBSCRIPTION_REQUIRED');
  assert.equal(errorCodeForHttpStatus(404), 'NOT_FOUND');
  assert.equal(errorCodeForHttpStatus(409), 'CONFLICT');
  assert.equal(errorCodeForHttpStatus(429), 'RATE_LIMITED');
  assert.equal(errorCodeForHttpStatus(500), 'INTERNAL_ERROR');
});

test('validates schedule success contract', () => {
  const payload = buildSuccessPayload({
    ...sharedScheduleInput(),
    currentDate: '2026-06-19',
    currentTime: '12:30',
    currentInterval: '12:30',
    currentPrice: 0.22,
    activeSlot: null,
    validForSeconds: 300,
    result: {
      feasible: true,
      reason: null,
      slots: [{
        startDate: '2026-06-19',
        start: '13:00',
        endDate: '2026-06-19',
        end: '14:30',
        energyKwh: 1.5,
        pricePerKwh: 0.2,
        cost: 0.3
      }],
      totalEnergyKwh: 1.5,
      totalCost: 0.3,
      averagePricePerKwh: 0.2,
      runtimeHours: 1.5,
      earliestPossibleCost: 0.6,
      savingsVsEarliest: 0.3,
      windowDurationHours: 12,
      crossesMidnight: false
    }
  });
  assert.deepEqual(validateScheduleContract(payload), []);
});

test('validates schedule unfeasible and waiting contracts', () => {
  const unfeasible = buildUnfeasiblePayload({
    ...sharedScheduleInput(),
    result: {
      feasible: false,
      reason: 'Za mało energii w oknie.',
      slots: [],
      totalEnergyKwh: 0,
      totalCost: 0,
      averagePricePerKwh: 0,
      runtimeHours: 0,
      earliestPossibleCost: null,
      savingsVsEarliest: null,
      windowDurationHours: 1,
      crossesMidnight: false
    }
  });
  const waiting = buildWaitingForPricesPayload({
    ...sharedScheduleInput(),
    currentDate: '2026-06-19',
    currentTime: '12:30',
    missingPriceDates: ['2026-06-19'],
    overnight: false
  });
  assert.deepEqual(validateScheduleContract(unfeasible), []);
  assert.deepEqual(validateScheduleContract(waiting), []);
});

test('validates savings summary contract', () => {
  const payload = versionApiPayload({
    status: 'success',
    currency: 'PLN',
    timezone: 'Europe/Warsaw',
    total_savings_pln: 12.4,
    total_energy_kwh: 30.5,
    total_cycles: 10,
    month_savings_pln: 3.2,
    month_energy_kwh: 8.1,
    month_cycles: 3,
    last_cycle_savings_pln: null,
    last_cycle_energy_kwh: null,
    last_cycle_device: null,
    last_cycle_ended_at: null,
    active_executions: 1,
    running_executions: 1,
    awaiting_price_executions: 0,
    updated_at: null
  });
  assert.deepEqual(validateSavingsSummaryContract(payload), []);
});

test('validates all execution lifecycle states', () => {
  const execution = {
    execution_id: '09fbd575-e812-4885-a961-265c7f11b875',
    device_name: 'dishwasher'
  };
  for (const status of ['running', 'completed', 'cancelled']) {
    const payload = versionApiPayload({ status, execution });
    assert.deepEqual(validateExecutionContract(payload), [], status);
  }
  const awaiting = versionApiPayload({
    status: 'awaiting_prices',
    retry_after_seconds: 300,
    execution
  }, 202);
  assert.deepEqual(validateExecutionContract(awaiting), []);
});

test('preserves lifecycle status while adding conflict error code', () => {
  const payload = versionApiPayload({
    status: 'cancelled',
    error: 'Cykl został anulowany.',
    execution: {
      execution_id: '09fbd575-e812-4885-a961-265c7f11b875',
      device_name: 'dishwasher'
    }
  }, 409);
  assert.equal(payload.status, 'cancelled');
  assert.equal(payload.error_code, 'CONFLICT');
  assert.deepEqual(validateExecutionContract(payload), []);
});

export const API_VERSION = '1.0';
export const API_VERSION_HEADER = 'X-EnergyOptimizer-API-Version';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'SUBSCRIPTION_REQUIRED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'HTTP_ERROR';

export type ApiPayload = Record<string, unknown>;

function isRecord(value: unknown): value is ApiPayload {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function errorCodeForHttpStatus(status: number): ApiErrorCode {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 401) return 'AUTHENTICATION_REQUIRED';
  if (status === 403) return 'SUBSCRIPTION_REQUIRED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'HTTP_ERROR';
}

export function versionApiPayload(body: unknown, httpStatus = 200): ApiPayload {
  const payload: ApiPayload = isRecord(body) ? { ...body } : { data: body };
  payload.api_version = API_VERSION;

  if (httpStatus >= 400 && typeof payload.error === 'string') {
    payload.error_code = typeof payload.error_code === 'string'
      ? payload.error_code
      : errorCodeForHttpStatus(httpStatus);
    if (typeof payload.status !== 'string') payload.status = 'error';
  }

  return payload;
}

function requireRecord(value: unknown, name: string, errors: string[]): ApiPayload | null {
  if (!isRecord(value)) {
    errors.push(`${name} must be an object`);
    return null;
  }
  return value;
}

function requireString(record: ApiPayload, key: string, errors: string[]): void {
  if (typeof record[key] !== 'string' || record[key] === '') {
    errors.push(`${key} must be a non-empty string`);
  }
}

function requireNumber(record: ApiPayload, key: string, errors: string[]): void {
  if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) {
    errors.push(`${key} must be a finite number`);
  }
}

function requireNullableNumber(record: ApiPayload, key: string, errors: string[]): void {
  if (record[key] !== null && (typeof record[key] !== 'number' || !Number.isFinite(record[key]))) {
    errors.push(`${key} must be a finite number or null`);
  }
}

function validateCommon(payload: unknown): { record: ApiPayload | null; errors: string[] } {
  const errors: string[] = [];
  const record = requireRecord(payload, 'payload', errors);
  if (record && record.api_version !== API_VERSION) {
    errors.push(`api_version must equal ${API_VERSION}`);
  }
  return { record, errors };
}

export function validateApiErrorContract(payload: unknown): string[] {
  const { record, errors } = validateCommon(payload);
  if (!record) return errors;
  requireString(record, 'error', errors);
  requireString(record, 'error_code', errors);
  return errors;
}

export function validateScheduleContract(payload: unknown): string[] {
  const { record, errors } = validateCommon(payload);
  if (!record) return errors;
  if (typeof record.error === 'string') return validateApiErrorContract(record);

  if (!['success', 'unfeasible', 'waiting_for_prices'].includes(String(record.status))) {
    errors.push('status must be success, unfeasible or waiting_for_prices');
  }
  requireString(record, 'timezone', errors);
  requireString(record, 'generated_at', errors);
  requireString(record, 'date', errors);
  requireString(record, 'day', errors);
  requireString(record, 'device_name', errors);
  if (typeof record.trigger_automation !== 'boolean') {
    errors.push('trigger_automation must be a boolean');
  }
  requireString(record, 'recommendation_reason', errors);

  const schedule = requireRecord(record.schedule, 'schedule', errors);
  if (schedule && !Array.isArray(schedule.slots)) errors.push('schedule.slots must be an array');
  return errors;
}

export function validateSavingsSummaryContract(payload: unknown): string[] {
  const { record, errors } = validateCommon(payload);
  if (!record) return errors;
  if (typeof record.error === 'string') return validateApiErrorContract(record);

  if (record.status !== 'success') errors.push('status must equal success');
  requireString(record, 'currency', errors);
  requireString(record, 'timezone', errors);
  for (const key of [
    'total_savings_pln',
    'total_energy_kwh',
    'total_cycles',
    'month_savings_pln',
    'month_energy_kwh',
    'month_cycles',
    'active_executions',
    'running_executions',
    'awaiting_price_executions'
  ]) requireNumber(record, key, errors);
  for (const key of ['last_cycle_savings_pln', 'last_cycle_energy_kwh']) {
    requireNullableNumber(record, key, errors);
  }
  return errors;
}

export function validateExecutionContract(payload: unknown): string[] {
  const { record, errors } = validateCommon(payload);
  if (!record) return errors;
  if (typeof record.error === 'string') {
    const errorErrors = validateApiErrorContract(record);
    if (record.status !== undefined && typeof record.status !== 'string') {
      errorErrors.push('status must be a string when present');
    }
    return errorErrors;
  }

  if (!['running', 'awaiting_prices', 'completed', 'cancelled'].includes(String(record.status))) {
    errors.push('status must be running, awaiting_prices, completed or cancelled');
  }
  const execution = requireRecord(record.execution, 'execution', errors);
  if (execution) {
    requireString(execution, 'execution_id', errors);
    requireString(execution, 'device_name', errors);
  }
  if (record.idempotent !== undefined && typeof record.idempotent !== 'boolean') {
    errors.push('idempotent must be a boolean when present');
  }
  if (record.status === 'awaiting_prices') requireNumber(record, 'retry_after_seconds', errors);
  return errors;
}

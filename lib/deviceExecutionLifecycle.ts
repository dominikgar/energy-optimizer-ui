export const DEFAULT_MAX_RUNNING_HOURS = 48;
export const MIN_MAX_RUNNING_HOURS = 1;
export const MAX_MAX_RUNNING_HOURS = 720;

export function resolveMaxRunningHours(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_RUNNING_HOURS;
  return Math.max(
    MIN_MAX_RUNNING_HOURS,
    Math.min(MAX_MAX_RUNNING_HOURS, Math.trunc(parsed))
  );
}

export function executionAgeHours(
  startedAt: string | Date,
  now: string | Date = new Date()
): number | null {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return null;
  return (current.getTime() - start.getTime()) / 3_600_000;
}

export function isStaleRunningExecution(
  startedAt: string | Date,
  now: string | Date = new Date(),
  maxRunningHours = DEFAULT_MAX_RUNNING_HOURS
): boolean {
  const ageHours = executionAgeHours(startedAt, now);
  return ageHours !== null && ageHours >= resolveMaxRunningHours(maxRunningHours);
}

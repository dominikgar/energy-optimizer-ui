export const WARSAW_TIME_ZONE = 'Europe/Warsaw';

export function formatWarsawDate(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: WARSAW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function formatWarsawTime(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: WARSAW_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(date);
}

export function getWarsawHour(date: Date): number {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: WARSAW_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23'
  }).format(date);
  return Number.parseInt(formatted, 10) % 24;
}

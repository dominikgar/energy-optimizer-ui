import { DeviceScheduleSlot } from './deviceScheduler';
import { isTimeInsideWindow } from './timeWindow';

export function timeToMinutes(time: string): number {
  if (time === '24:00') return 1440;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function crossesMidnight(earliestStart: string, latestEnd: string): boolean {
  return latestEnd !== '24:00' && timeToMinutes(latestEnd) <= timeToMinutes(earliestStart);
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function resolveBaseDate(
  currentDate: string,
  currentTime: string,
  requestedDay: 'today' | 'tomorrow',
  earliestStart: string,
  latestEnd: string
): string {
  if (requestedDay === 'tomorrow') return addDays(currentDate, 1);

  if (
    crossesMidnight(earliestStart, latestEnd)
    && timeToMinutes(currentTime) < timeToMinutes(latestEnd)
  ) {
    return addDays(currentDate, -1);
  }

  return currentDate;
}

export function isCurrentInsideSlot(
  currentDate: string,
  currentTime: string,
  slot: DeviceScheduleSlot
): boolean {
  if (!slot.startDate || !slot.endDate) {
    return isTimeInsideWindow(currentTime, slot.start, slot.end);
  }

  if (slot.startDate === slot.endDate) {
    return currentDate === slot.startDate
      && isTimeInsideWindow(currentTime, slot.start, slot.end);
  }

  if (currentDate === slot.startDate) {
    return timeToMinutes(currentTime) >= timeToMinutes(slot.start);
  }

  if (currentDate === slot.endDate) {
    return timeToMinutes(currentTime) < timeToMinutes(slot.end);
  }

  return false;
}

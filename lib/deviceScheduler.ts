export interface DevicePriceInterval {
  start: string;
  pricePerKwh: number;
  durationMinutes: number;
  dayOffset?: number;
  date?: string;
}

export interface DeviceScheduleRequest {
  energyRequiredKwh: number;
  maxPowerKw: number;
  earliestStart: string;
  latestEnd: string;
  requireContiguous: boolean;
}

export interface DeviceScheduleSlot {
  start: string;
  end: string;
  startDayOffset: number;
  endDayOffset: number;
  startDate: string | null;
  endDate: string | null;
  energyKwh: number;
  pricePerKwh: number;
  cost: number;
}

export interface DeviceScheduleResult {
  feasible: boolean;
  reason: string | null;
  slots: DeviceScheduleSlot[];
  totalEnergyKwh: number;
  totalCost: number;
  averagePricePerKwh: number;
  runtimeHours: number;
  earliestPossibleCost: number | null;
  savingsVsEarliest: number | null;
  crossesMidnight: boolean;
  windowDurationHours: number;
}

const MINUTES_PER_DAY = 24 * 60;

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function timeToMinutes(time: string): number {
  if (time === '24:00') return MINUTES_PER_DAY;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return Number.NaN;
  return hour * 60 + minute;
}

function formatClock(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function absoluteStartMinutes(interval: DevicePriceInterval): number {
  return timeToMinutes(interval.start) + Math.max(0, Math.trunc(interval.dayOffset ?? 0)) * MINUTES_PER_DAY;
}

function formatEnd(
  absoluteEnd: number,
  startAbsolute: number
): { time: string; dayOffset: number } {
  const rawDayOffset = Math.floor(absoluteEnd / MINUTES_PER_DAY);
  const minuteOfDay = absoluteEnd % MINUTES_PER_DAY;

  if (minuteOfDay === 0 && absoluteEnd > startAbsolute) {
    return {
      time: '24:00',
      dayOffset: Math.max(0, rawDayOffset - 1)
    };
  }

  return {
    time: formatClock(absoluteEnd),
    dayOffset: rawDayOffset
  };
}

function allocateInterval(
  interval: DevicePriceInterval,
  energyKwh: number,
  powerKw: number
): DeviceScheduleSlot {
  const startAbsolute = absoluteStartMinutes(interval);
  const startDayOffset = Math.max(0, Math.trunc(interval.dayOffset ?? 0));
  const runtimeMinutes = Math.min(
    interval.durationMinutes,
    Math.ceil((energyKwh / powerKw) * 60)
  );
  const actualEnergy = Math.min(
    energyKwh,
    powerKw * (runtimeMinutes / 60)
  );
  const end = formatEnd(startAbsolute + runtimeMinutes, startAbsolute);
  const startDate = interval.date ?? null;
  const endDate = startDate
    ? addDays(startDate, end.dayOffset - startDayOffset)
    : null;

  return {
    start: interval.start,
    end: end.time,
    startDayOffset,
    endDayOffset: end.dayOffset,
    startDate,
    endDate,
    energyKwh: actualEnergy,
    pricePerKwh: interval.pricePerKwh,
    cost: actualEnergy * interval.pricePerKwh
  };
}

function totalCost(slots: DeviceScheduleSlot[]): number {
  return slots.reduce((sum, slot) => sum + slot.cost, 0);
}

function chronologicalSchedule(
  intervals: DevicePriceInterval[],
  energyRequiredKwh: number,
  powerKw: number
): DeviceScheduleSlot[] | null {
  let remaining = energyRequiredKwh;
  const slots: DeviceScheduleSlot[] = [];

  for (const interval of intervals) {
    if (remaining <= 1e-9) break;
    const capacity = powerKw * (interval.durationMinutes / 60);
    const allocated = Math.min(remaining, capacity);
    const slot = allocateInterval(interval, allocated, powerKw);
    slots.push(slot);
    remaining -= slot.energyKwh;
  }

  return remaining <= 1e-6 ? slots : null;
}

function buildContiguousCandidate(
  intervals: DevicePriceInterval[],
  startIndex: number,
  energyRequiredKwh: number,
  powerKw: number
): DeviceScheduleSlot[] | null {
  let remaining = energyRequiredKwh;
  const candidate: DeviceScheduleSlot[] = [];
  let expectedStart = absoluteStartMinutes(intervals[startIndex]);

  for (let index = startIndex; index < intervals.length && remaining > 1e-9; index++) {
    const interval = intervals[index];
    const intervalStart = absoluteStartMinutes(interval);
    if (intervalStart !== expectedStart) break;

    const capacity = powerKw * (interval.durationMinutes / 60);
    const allocated = Math.min(remaining, capacity);
    const slot = allocateInterval(interval, allocated, powerKw);
    candidate.push(slot);
    remaining -= slot.energyKwh;
    expectedStart = intervalStart + interval.durationMinutes;
  }

  return remaining <= 1e-6 ? candidate : null;
}

function cheapestFlexibleSchedule(
  intervals: DevicePriceInterval[],
  energyRequiredKwh: number,
  powerKw: number
): DeviceScheduleSlot[] | null {
  const byPrice = [...intervals].sort((a, b) => {
    if (a.pricePerKwh !== b.pricePerKwh) return a.pricePerKwh - b.pricePerKwh;
    return absoluteStartMinutes(a) - absoluteStartMinutes(b);
  });

  const selected = chronologicalSchedule(byPrice, energyRequiredKwh, powerKw);
  if (!selected) return null;

  return selected.sort((a, b) => {
    const aStart = timeToMinutes(a.start) + a.startDayOffset * MINUTES_PER_DAY;
    const bStart = timeToMinutes(b.start) + b.startDayOffset * MINUTES_PER_DAY;
    return aStart - bStart;
  });
}

function cheapestContiguousSchedule(
  intervals: DevicePriceInterval[],
  energyRequiredKwh: number,
  powerKw: number
): DeviceScheduleSlot[] | null {
  let best: DeviceScheduleSlot[] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (let startIndex = 0; startIndex < intervals.length; startIndex++) {
    const candidate = buildContiguousCandidate(
      intervals,
      startIndex,
      energyRequiredKwh,
      powerKw
    );
    if (!candidate) continue;

    const candidateCost = totalCost(candidate);
    if (candidateCost < bestCost) {
      bestCost = candidateCost;
      best = candidate;
    }
  }

  return best;
}

function earliestContiguousSchedule(
  intervals: DevicePriceInterval[],
  energyRequiredKwh: number,
  powerKw: number
): DeviceScheduleSlot[] | null {
  for (let startIndex = 0; startIndex < intervals.length; startIndex++) {
    const candidate = buildContiguousCandidate(
      intervals,
      startIndex,
      energyRequiredKwh,
      powerKw
    );
    if (candidate) return candidate;
  }
  return null;
}

export function scheduleDevice(
  priceIntervals: DevicePriceInterval[],
  request: DeviceScheduleRequest
): DeviceScheduleResult {
  const energyRequiredKwh = Math.max(0, finiteOrZero(request.energyRequiredKwh));
  const maxPowerKw = Math.max(0, finiteOrZero(request.maxPowerKw));
  const earliestMinutes = timeToMinutes(request.earliestStart);
  const rawLatestMinutes = timeToMinutes(request.latestEnd);
  const crossesMidnight = request.latestEnd !== '24:00'
    && Number.isFinite(earliestMinutes)
    && Number.isFinite(rawLatestMinutes)
    && rawLatestMinutes <= earliestMinutes;
  const latestMinutes = crossesMidnight
    ? rawLatestMinutes + MINUTES_PER_DAY
    : rawLatestMinutes;
  const windowDurationHours = Number.isFinite(earliestMinutes) && Number.isFinite(latestMinutes)
    ? Math.max(0, latestMinutes - earliestMinutes) / 60
    : 0;

  const emptyResult = (reason: string): DeviceScheduleResult => ({
    feasible: false,
    reason,
    slots: [],
    totalEnergyKwh: 0,
    totalCost: 0,
    averagePricePerKwh: 0,
    runtimeHours: 0,
    earliestPossibleCost: null,
    savingsVsEarliest: null,
    crossesMidnight,
    windowDurationHours
  });

  if (energyRequiredKwh <= 0) return emptyResult('Wymagana energia musi być większa od zera.');
  if (maxPowerKw <= 0) return emptyResult('Moc urządzenia musi być większa od zera.');
  if (!Number.isFinite(earliestMinutes) || !Number.isFinite(latestMinutes)) {
    return emptyResult('Nieprawidłowe godziny dostępności.');
  }
  if (latestMinutes <= earliestMinutes) {
    return emptyResult('Okno dostępności musi mieć dodatnią długość.');
  }

  const eligible = priceIntervals
    .filter((interval) => {
      const start = absoluteStartMinutes(interval);
      const end = start + interval.durationMinutes;
      return Number.isFinite(start)
        && interval.durationMinutes > 0
        && Number.isFinite(interval.pricePerKwh)
        && start >= earliestMinutes
        && end <= latestMinutes;
    })
    .sort((a, b) => absoluteStartMinutes(a) - absoluteStartMinutes(b));

  const availableEnergy = eligible.reduce(
    (sum, interval) => sum + maxPowerKw * (interval.durationMinutes / 60),
    0
  );
  if (availableEnergy + 1e-6 < energyRequiredKwh) {
    return emptyResult(`W wybranym oknie można dostarczyć maksymalnie ${availableEnergy.toFixed(2)} kWh.`);
  }

  const optimized = request.requireContiguous
    ? cheapestContiguousSchedule(eligible, energyRequiredKwh, maxPowerKw)
    : cheapestFlexibleSchedule(eligible, energyRequiredKwh, maxPowerKw);

  if (!optimized) {
    return emptyResult(request.requireContiguous
      ? 'Nie znaleziono wystarczająco długiego ciągłego okna pracy.'
      : 'Nie udało się zbudować harmonogramu dla podanych ograniczeń.');
  }

  const earliest = request.requireContiguous
    ? earliestContiguousSchedule(eligible, energyRequiredKwh, maxPowerKw)
    : chronologicalSchedule(eligible, energyRequiredKwh, maxPowerKw);
  const optimizedCost = totalCost(optimized);
  const earliestCost = earliest ? totalCost(earliest) : null;
  const deliveredEnergy = optimized.reduce((sum, slot) => sum + slot.energyKwh, 0);
  const runtimeHours = deliveredEnergy / maxPowerKw;

  return {
    feasible: true,
    reason: null,
    slots: optimized,
    totalEnergyKwh: deliveredEnergy,
    totalCost: optimizedCost,
    averageCostPerKwh: deliveredEnergy > 0 ? optimizedCost / deliveredEnergy : 0,
    runtimeHours,
    earliestPossibleCost: earliestCost,
    savingsVsEarliest: earliestCost === null ? null : earliestCost - optimizedCost,
    crossesMidnight,
    windowDurationHours
  };
}

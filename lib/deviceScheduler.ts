export interface DevicePriceInterval {
  start: string;
  pricePerKwh: number;
  durationMinutes: number;
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
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function timeToMinutes(time: string): number {
  if (time === '24:00') return 1440;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return Number.NaN;
  return hour * 60 + minute;
}

function minutesToTime(minutes: number): string {
  if (minutes >= 1440) return '24:00';
  const safe = Math.max(0, minutes);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function allocateInterval(
  interval: DevicePriceInterval,
  energyKwh: number,
  powerKw: number
): DeviceScheduleSlot {
  const startMinutes = timeToMinutes(interval.start);
  const runtimeMinutes = Math.min(
    interval.durationMinutes,
    Math.ceil((energyKwh / powerKw) * 60)
  );
  const actualEnergy = Math.min(
    energyKwh,
    powerKw * (runtimeMinutes / 60)
  );

  return {
    start: interval.start,
    end: minutesToTime(startMinutes + runtimeMinutes),
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
  let expectedStart = timeToMinutes(intervals[startIndex].start);

  for (let index = startIndex; index < intervals.length && remaining > 1e-9; index++) {
    const interval = intervals[index];
    const intervalStart = timeToMinutes(interval.start);
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
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });

  const selected = chronologicalSchedule(byPrice, energyRequiredKwh, powerKw);
  if (!selected) return null;

  return selected.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
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
  const latestMinutes = timeToMinutes(request.latestEnd);

  const emptyResult = (reason: string): DeviceScheduleResult => ({
    feasible: false,
    reason,
    slots: [],
    totalEnergyKwh: 0,
    totalCost: 0,
    averagePricePerKwh: 0,
    runtimeHours: 0,
    earliestPossibleCost: null,
    savingsVsEarliest: null
  });

  if (energyRequiredKwh <= 0) return emptyResult('Wymagana energia musi być większa od zera.');
  if (maxPowerKw <= 0) return emptyResult('Moc urządzenia musi być większa od zera.');
  if (!Number.isFinite(earliestMinutes) || !Number.isFinite(latestMinutes)) {
    return emptyResult('Nieprawidłowe godziny dostępności.');
  }
  if (latestMinutes <= earliestMinutes) {
    return emptyResult('Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia w ramach jednej doby.');
  }

  const eligible = priceIntervals
    .filter((interval) => {
      const start = timeToMinutes(interval.start);
      const end = start + interval.durationMinutes;
      return Number.isFinite(start)
        && interval.durationMinutes > 0
        && Number.isFinite(interval.pricePerKwh)
        && start >= earliestMinutes
        && end <= latestMinutes;
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

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
    averagePricePerKwh: deliveredEnergy > 0 ? optimizedCost / deliveredEnergy : 0,
    runtimeHours,
    earliestPossibleCost: earliestCost,
    savingsVsEarliest: earliestCost === null ? null : earliestCost - optimizedCost
  };
}

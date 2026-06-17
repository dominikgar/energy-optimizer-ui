import { DevicePriceInterval } from './deviceScheduler';

export interface HeatPumpComfortRequest {
  initialIndoorTempC: number;
  minimumComfortTempC: number;
  targetEndTempC: number;
  maximumPreheatTempC: number;
  thermalCapacityKwhPerC: number;
  heatLossKw: number;
  cop: number;
  maxElectricalPowerKw: number;
  earliestStart: string;
  latestEnd: string;
}

export interface HeatPumpComfortInterval {
  start: string;
  end: string;
  startDate: string | null;
  endDate: string | null;
  powerFraction: number;
  electricalPowerKw: number;
  electricalEnergyKwh: number;
  thermalEnergyKwh: number;
  heatLossKwh: number;
  temperatureStartC: number;
  temperatureEndC: number;
  pricePerKwh: number;
  cost: number;
}

export interface HeatPumpComfortResult {
  feasible: boolean;
  reason: string | null;
  timeline: HeatPumpComfortInterval[];
  heatingIntervals: HeatPumpComfortInterval[];
  totalElectricalEnergyKwh: number;
  totalThermalEnergyKwh: number;
  totalHeatLossKwh: number;
  totalCost: number;
  averagePricePerKwh: number;
  equivalentRuntimeHours: number;
  minimumProjectedTempC: number;
  maximumProjectedTempC: number;
  endTemperatureC: number;
  crossesMidnight: boolean;
}

interface StateNode {
  temperatureC: number;
  cost: number;
  electricalEnergyKwh: number;
  parentKey: number | null;
  powerFraction: number;
}

const MINUTES_PER_DAY = 1440;
const TEMPERATURE_STEP_C = 0.05;
const EPSILON = 1e-7;

function timeToMinutes(time: string): number {
  if (time === '24:00') return MINUTES_PER_DAY;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return Number.NaN;
  return hour * 60 + minute;
}

function formatTime(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function absoluteStart(interval: DevicePriceInterval): number {
  return timeToMinutes(interval.start) + Math.max(0, Math.trunc(interval.dayOffset ?? 0)) * MINUTES_PER_DAY;
}

function intervalEnd(interval: DevicePriceInterval): { time: string; date: string | null } {
  const startAbsolute = absoluteStart(interval);
  const endAbsolute = startAbsolute + interval.durationMinutes;
  const startDayOffset = Math.max(0, Math.trunc(interval.dayOffset ?? 0));
  const endDayOffset = Math.floor(endAbsolute / MINUTES_PER_DAY);
  const endMinute = endAbsolute % MINUTES_PER_DAY;
  const endTime = endMinute === 0 ? '24:00' : formatTime(endAbsolute);
  const date = interval.date
    ? addDays(interval.date, endMinute === 0 ? Math.max(0, endDayOffset - startDayOffset - 1) : endDayOffset - startDayOffset)
    : null;
  return { time: endTime, date };
}

function quantizeTemperature(temperatureC: number): number {
  return Math.round(temperatureC / TEMPERATURE_STEP_C);
}

function uniqueFractions(values: number[]): number[] {
  const result = new Set<number>();
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    const clamped = Math.max(0, Math.min(1, value));
    result.add(Math.round(clamped * 10000) / 10000);
  }
  return [...result].sort((a, b) => a - b);
}

function actionFractions(
  temperatureC: number,
  durationHours: number,
  request: HeatPumpComfortRequest,
  isFinalInterval: boolean
): number[] {
  const maximumThermalEnergy = request.maxElectricalPowerKw * request.cop * durationHours;
  const heatLossEnergy = request.heatLossKw * durationHours;
  const fractionToReach = (targetC: number) => (
    (targetC - temperatureC) * request.thermalCapacityKwhPerC + heatLossEnergy
  ) / maximumThermalEnergy;

  return uniqueFractions([
    0,
    0.25,
    0.5,
    0.75,
    1,
    fractionToReach(request.minimumComfortTempC),
    fractionToReach(request.maximumPreheatTempC),
    ...(isFinalInterval ? [fractionToReach(request.targetEndTempC)] : [])
  ]);
}

function invalid(reason: string, crossesMidnight = false): HeatPumpComfortResult {
  return {
    feasible: false,
    reason,
    timeline: [],
    heatingIntervals: [],
    totalElectricalEnergyKwh: 0,
    totalThermalEnergyKwh: 0,
    totalHeatLossKwh: 0,
    totalCost: 0,
    averagePricePerKwh: 0,
    equivalentRuntimeHours: 0,
    minimumProjectedTempC: 0,
    maximumProjectedTempC: 0,
    endTemperatureC: 0,
    crossesMidnight
  };
}

export function scheduleHeatPumpWithComfort(
  priceIntervals: DevicePriceInterval[],
  request: HeatPumpComfortRequest
): HeatPumpComfortResult {
  const earliestMinutes = timeToMinutes(request.earliestStart);
  const rawLatestMinutes = timeToMinutes(request.latestEnd);
  const crossesMidnight = request.latestEnd !== '24:00'
    && Number.isFinite(earliestMinutes)
    && Number.isFinite(rawLatestMinutes)
    && rawLatestMinutes <= earliestMinutes;
  const latestMinutes = crossesMidnight ? rawLatestMinutes + MINUTES_PER_DAY : rawLatestMinutes;

  if (!Number.isFinite(earliestMinutes) || !Number.isFinite(latestMinutes) || latestMinutes <= earliestMinutes) {
    return invalid('Nieprawidłowe okno czasu.', crossesMidnight);
  }
  if (!Number.isFinite(request.initialIndoorTempC)) return invalid('Temperatura początkowa jest nieprawidłowa.', crossesMidnight);
  if (!Number.isFinite(request.minimumComfortTempC) || !Number.isFinite(request.maximumPreheatTempC)) {
    return invalid('Zakres temperatur komfortu jest nieprawidłowy.', crossesMidnight);
  }
  if (request.initialIndoorTempC < request.minimumComfortTempC - EPSILON) {
    return invalid('Temperatura początkowa jest już niższa od minimum komfortu.', crossesMidnight);
  }
  if (request.maximumPreheatTempC <= request.minimumComfortTempC) {
    return invalid('Maksymalna temperatura podgrzania musi być wyższa od minimum komfortu.', crossesMidnight);
  }
  if (request.targetEndTempC < request.minimumComfortTempC || request.targetEndTempC > request.maximumPreheatTempC) {
    return invalid('Temperatura końcowa musi mieścić się w zakresie komfortu.', crossesMidnight);
  }
  if (!Number.isFinite(request.thermalCapacityKwhPerC) || request.thermalCapacityKwhPerC <= 0) {
    return invalid('Pojemność cieplna budynku musi być większa od zera.', crossesMidnight);
  }
  if (!Number.isFinite(request.heatLossKw) || request.heatLossKw < 0) {
    return invalid('Strata ciepła nie może być ujemna.', crossesMidnight);
  }
  if (!Number.isFinite(request.cop) || request.cop < 1 || request.cop > 10) {
    return invalid('COP musi mieścić się w zakresie od 1 do 10.', crossesMidnight);
  }
  if (!Number.isFinite(request.maxElectricalPowerKw) || request.maxElectricalPowerKw <= 0) {
    return invalid('Moc elektryczna pompy musi być większa od zera.', crossesMidnight);
  }

  const intervals = priceIntervals
    .filter((interval) => {
      const start = absoluteStart(interval);
      const end = start + interval.durationMinutes;
      return Number.isFinite(start)
        && interval.durationMinutes > 0
        && Number.isFinite(interval.pricePerKwh)
        && start >= earliestMinutes
        && end <= latestMinutes;
    })
    .sort((a, b) => absoluteStart(a) - absoluteStart(b));

  if (intervals.length === 0) return invalid('Brak cen w wybranym oknie.', crossesMidnight);

  for (let index = 1; index < intervals.length; index++) {
    const previousEnd = absoluteStart(intervals[index - 1]) + intervals[index - 1].durationMinutes;
    if (absoluteStart(intervals[index]) !== previousEnd) {
      return invalid('Dane cenowe nie pokrywają całego okna bez przerw.', crossesMidnight);
    }
  }

  const layers: Map<number, StateNode>[] = [];
  const initialKey = quantizeTemperature(request.initialIndoorTempC);
  layers.push(new Map([[initialKey, {
    temperatureC: request.initialIndoorTempC,
    cost: 0,
    electricalEnergyKwh: 0,
    parentKey: null,
    powerFraction: 0
  }]]));

  for (let intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
    const interval = intervals[intervalIndex];
    const durationHours = interval.durationMinutes / 60;
    const nextLayer = new Map<number, StateNode>();
    const isFinalInterval = intervalIndex === intervals.length - 1;

    for (const [parentKey, state] of layers[intervalIndex]) {
      for (const powerFraction of actionFractions(state.temperatureC, durationHours, request, isFinalInterval)) {
        const electricalEnergyKwh = request.maxElectricalPowerKw * powerFraction * durationHours;
        const thermalEnergyKwh = electricalEnergyKwh * request.cop;
        const heatLossKwh = request.heatLossKw * durationHours;
        const nextTemperatureC = state.temperatureC
          + (thermalEnergyKwh - heatLossKwh) / request.thermalCapacityKwhPerC;

        if (nextTemperatureC < request.minimumComfortTempC - EPSILON) continue;
        if (nextTemperatureC > request.maximumPreheatTempC + EPSILON) continue;

        const key = quantizeTemperature(nextTemperatureC);
        const cost = state.cost + electricalEnergyKwh * interval.pricePerKwh;
        const totalEnergy = state.electricalEnergyKwh + electricalEnergyKwh;
        const existing = nextLayer.get(key);

        if (
          !existing
          || cost < existing.cost - EPSILON
          || (Math.abs(cost - existing.cost) <= EPSILON && nextTemperatureC > existing.temperatureC)
        ) {
          nextLayer.set(key, {
            temperatureC: nextTemperatureC,
            cost,
            electricalEnergyKwh: totalEnergy,
            parentKey,
            powerFraction
          });
        }
      }
    }

    if (nextLayer.size === 0) {
      return invalid('Pompa nie jest w stanie utrzymać minimalnej temperatury w całym oknie.', crossesMidnight);
    }
    layers.push(nextLayer);
  }

  let finalKey: number | null = null;
  let finalNode: StateNode | null = null;
  for (const [key, node] of layers[layers.length - 1]) {
    if (node.temperatureC < request.targetEndTempC - EPSILON) continue;
    if (!finalNode || node.cost < finalNode.cost - EPSILON) {
      finalKey = key;
      finalNode = node;
    }
  }

  if (finalKey === null || !finalNode) {
    return invalid('Nie da się osiągnąć wymaganej temperatury końcowej w wybranym oknie.', crossesMidnight);
  }

  const timeline: HeatPumpComfortInterval[] = [];
  let key = finalKey;
  for (let intervalIndex = intervals.length - 1; intervalIndex >= 0; intervalIndex--) {
    const interval = intervals[intervalIndex];
    const node = layers[intervalIndex + 1].get(key);
    if (!node || node.parentKey === null) return invalid('Nie udało się odtworzyć harmonogramu.', crossesMidnight);
    const parent = layers[intervalIndex].get(node.parentKey);
    if (!parent) return invalid('Nie udało się odtworzyć temperatury początkowej.', crossesMidnight);

    const durationHours = interval.durationMinutes / 60;
    const electricalPowerKw = request.maxElectricalPowerKw * node.powerFraction;
    const electricalEnergyKwh = electricalPowerKw * durationHours;
    const thermalEnergyKwh = electricalEnergyKwh * request.cop;
    const heatLossKwh = request.heatLossKw * durationHours;
    const end = intervalEnd(interval);

    timeline.push({
      start: interval.start,
      end: end.time,
      startDate: interval.date ?? null,
      endDate: end.date,
      powerFraction: node.powerFraction,
      electricalPowerKw,
      electricalEnergyKwh,
      thermalEnergyKwh,
      heatLossKwh,
      temperatureStartC: parent.temperatureC,
      temperatureEndC: node.temperatureC,
      pricePerKwh: interval.pricePerKwh,
      cost: electricalEnergyKwh * interval.pricePerKwh
    });
    key = node.parentKey;
  }
  timeline.reverse();

  const heatingIntervals = timeline.filter((item) => item.powerFraction > EPSILON);
  const totalElectricalEnergyKwh = timeline.reduce((sum, item) => sum + item.electricalEnergyKwh, 0);
  const totalThermalEnergyKwh = timeline.reduce((sum, item) => sum + item.thermalEnergyKwh, 0);
  const totalHeatLossKwh = timeline.reduce((sum, item) => sum + item.heatLossKwh, 0);
  const temperatures = [request.initialIndoorTempC, ...timeline.map((item) => item.temperatureEndC)];

  return {
    feasible: true,
    reason: null,
    timeline,
    heatingIntervals,
    totalElectricalEnergyKwh,
    totalThermalEnergyKwh,
    totalHeatLossKwh,
    totalCost: finalNode.cost,
    averagePricePerKwh: totalElectricalEnergyKwh > 0 ? finalNode.cost / totalElectricalEnergyKwh : 0,
    equivalentRuntimeHours: totalElectricalEnergyKwh / request.maxElectricalPowerKw,
    minimumProjectedTempC: Math.min(...temperatures),
    maximumProjectedTempC: Math.max(...temperatures),
    endTemperatureC: finalNode.temperatureC,
    crossesMidnight
  };
}

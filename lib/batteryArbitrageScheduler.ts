import { DevicePriceInterval } from './deviceScheduler';

export interface BatteryEnergyInterval extends DevicePriceInterval {
  householdLoadKw: number;
  pvGenerationKw: number;
}

export interface BatteryArbitrageRequest {
  usableCapacityKwh: number;
  initialSocPercent: number;
  minimumSocPercent: number;
  targetEndSocPercent: number;
  maxChargePowerKw: number;
  maxDischargePowerKw: number;
  chargeEfficiencyPercent: number;
  dischargeEfficiencyPercent: number;
  batteryWearCostPerKwh: number;
  allowGridCharging: boolean;
  allowExport: boolean;
  exportPriceFactor: number;
  earliestStart: string;
  latestEnd: string;
}

export interface BatteryArbitrageStep {
  start: string;
  end: string;
  date: string | null;
  action: 'charge' | 'discharge' | 'idle';
  batteryPowerKw: number;
  socStartPercent: number;
  socEndPercent: number;
  gridImportKwh: number;
  gridExportKwh: number;
  pvGenerationKwh: number;
  householdLoadKwh: number;
  energyPricePlnKwh: number;
  energyCostPln: number;
  wearCostPln: number;
  netCostPln: number;
}

export interface BatteryArbitrageResult {
  feasible: boolean;
  reason: string | null;
  timeline: BatteryArbitrageStep[];
  activeSteps: BatteryArbitrageStep[];
  baselineCostPln: number;
  optimizedCostPln: number;
  savingsPln: number;
  totalGridImportKwh: number;
  totalGridExportKwh: number;
  totalChargedKwh: number;
  totalDischargedKwh: number;
  endSocPercent: number;
  crossesMidnight: boolean;
}

interface StateNode {
  storedEnergyKwh: number;
  cost: number;
  parentKey: number | null;
  batteryPowerKw: number;
}

const MINUTES_PER_DAY = 1440;
const ENERGY_STEP_KWH = 0.05;
const EPSILON = 1e-8;

function timeToMinutes(time: string): number {
  if (time === '24:00') return MINUTES_PER_DAY;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return Number.NaN;
  return hour * 60 + minute;
}

function absoluteStart(interval: BatteryEnergyInterval): number {
  return timeToMinutes(interval.start) + Math.max(0, Math.trunc(interval.dayOffset ?? 0)) * MINUTES_PER_DAY;
}

function endTime(interval: BatteryEnergyInterval): string {
  const end = absoluteStart(interval) + interval.durationMinutes;
  if (end % MINUTES_PER_DAY === 0) return '24:00';
  const normalized = end % MINUTES_PER_DAY;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function quantizeEnergy(value: number): number {
  return Math.round(value / ENERGY_STEP_KWH);
}

function uniquePowers(values: number[]): number[] {
  const result = new Set<number>();
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    result.add(Math.round(value * 10000) / 10000);
  }
  return [...result].sort((a, b) => a - b);
}

function invalid(reason: string, crossesMidnight = false): BatteryArbitrageResult {
  return {
    feasible: false,
    reason,
    timeline: [],
    activeSteps: [],
    baselineCostPln: 0,
    optimizedCostPln: 0,
    savingsPln: 0,
    totalGridImportKwh: 0,
    totalGridExportKwh: 0,
    totalChargedKwh: 0,
    totalDischargedKwh: 0,
    endSocPercent: 0,
    crossesMidnight
  };
}

function gridEnergyCost(
  netGridKwh: number,
  price: number,
  allowExport: boolean,
  exportPriceFactor: number
): { importKwh: number; exportKwh: number; cost: number } {
  if (netGridKwh >= 0) {
    return { importKwh: netGridKwh, exportKwh: 0, cost: netGridKwh * price };
  }

  const exportKwh = -netGridKwh;
  if (!allowExport) return { importKwh: 0, exportKwh: 0, cost: 0 };
  return {
    importKwh: 0,
    exportKwh,
    cost: -exportKwh * price * exportPriceFactor
  };
}

export function scheduleBatteryArbitrage(
  priceIntervals: BatteryEnergyInterval[],
  request: BatteryArbitrageRequest
): BatteryArbitrageResult {
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
  if (!Number.isFinite(request.usableCapacityKwh) || request.usableCapacityKwh <= 0) {
    return invalid('Pojemność użyteczna musi być większa od zera.', crossesMidnight);
  }
  if (request.minimumSocPercent < 0 || request.minimumSocPercent > 100) {
    return invalid('Minimalny SoC musi mieścić się w zakresie 0–100%.', crossesMidnight);
  }
  if (request.initialSocPercent < request.minimumSocPercent || request.initialSocPercent > 100) {
    return invalid('Początkowy SoC musi mieścić się między minimum a 100%.', crossesMidnight);
  }
  if (request.targetEndSocPercent < request.minimumSocPercent || request.targetEndSocPercent > 100) {
    return invalid('Końcowy SoC musi mieścić się między minimum a 100%.', crossesMidnight);
  }
  if (request.maxChargePowerKw <= 0 || request.maxDischargePowerKw <= 0) {
    return invalid('Moc ładowania i rozładowania musi być większa od zera.', crossesMidnight);
  }
  if (request.chargeEfficiencyPercent <= 0 || request.chargeEfficiencyPercent > 100
    || request.dischargeEfficiencyPercent <= 0 || request.dischargeEfficiencyPercent > 100) {
    return invalid('Sprawność musi mieścić się w zakresie 0–100%.', crossesMidnight);
  }
  if (request.batteryWearCostPerKwh < 0 || request.exportPriceFactor < 0 || request.exportPriceFactor > 1) {
    return invalid('Koszt zużycia i współczynnik eksportu są nieprawidłowe.', crossesMidnight);
  }

  const intervals = priceIntervals
    .filter((interval) => {
      const start = absoluteStart(interval);
      const end = start + interval.durationMinutes;
      return Number.isFinite(start)
        && interval.durationMinutes > 0
        && Number.isFinite(interval.pricePerKwh)
        && Number.isFinite(interval.householdLoadKw)
        && Number.isFinite(interval.pvGenerationKw)
        && start >= earliestMinutes
        && end <= latestMinutes;
    })
    .sort((a, b) => absoluteStart(a) - absoluteStart(b));

  if (intervals.length === 0) return invalid('Brak danych w wybranym oknie.', crossesMidnight);

  const capacity = request.usableCapacityKwh;
  const minimumEnergy = capacity * request.minimumSocPercent / 100;
  const initialEnergy = capacity * request.initialSocPercent / 100;
  const targetEndEnergy = capacity * request.targetEndSocPercent / 100;
  const chargeEfficiency = request.chargeEfficiencyPercent / 100;
  const dischargeEfficiency = request.dischargeEfficiencyPercent / 100;

  const layers: Map<number, StateNode>[] = [new Map([
    [quantizeEnergy(initialEnergy), {
      storedEnergyKwh: initialEnergy,
      cost: 0,
      parentKey: null,
      batteryPowerKw: 0
    }]
  ])];

  let baselineCostPln = 0;
  for (let index = 0; index < intervals.length; index++) {
    const interval = intervals[index];
    const durationHours = interval.durationMinutes / 60;
    const baseNetGridKwh = (interval.householdLoadKw - interval.pvGenerationKw) * durationHours;
    baselineCostPln += gridEnergyCost(
      baseNetGridKwh,
      interval.pricePerKwh,
      request.allowExport,
      request.exportPriceFactor
    ).cost;

    const nextLayer = new Map<number, StateNode>();
    const netLoadKw = interval.householdLoadKw - interval.pvGenerationKw;
    const surplusPvKw = Math.max(0, -netLoadKw);
    const usefulDischargeKw = Math.max(0, netLoadKw);

    const chargeLimit = request.allowGridCharging
      ? request.maxChargePowerKw
      : Math.min(request.maxChargePowerKw, surplusPvKw);
    const dischargeLimit = request.allowExport
      ? request.maxDischargePowerKw
      : Math.min(request.maxDischargePowerKw, usefulDischargeKw);

    const candidatePowers = uniquePowers([
      0,
      chargeLimit * 0.25,
      chargeLimit * 0.5,
      chargeLimit * 0.75,
      chargeLimit,
      -dischargeLimit * 0.25,
      -dischargeLimit * 0.5,
      -dischargeLimit * 0.75,
      -dischargeLimit
    ]);

    for (const [parentKey, state] of layers[index]) {
      for (const batteryPowerKw of candidatePowers) {
        const storedDelta = batteryPowerKw >= 0
          ? batteryPowerKw * chargeEfficiency * durationHours
          : batteryPowerKw / dischargeEfficiency * durationHours;
        const nextEnergy = state.storedEnergyKwh + storedDelta;
        if (nextEnergy < minimumEnergy - EPSILON || nextEnergy > capacity + EPSILON) continue;

        const netGridKwh = (netLoadKw + batteryPowerKw) * durationHours;
        const grid = gridEnergyCost(
          netGridKwh,
          interval.pricePerKwh,
          request.allowExport,
          request.exportPriceFactor
        );
        const throughputKwh = Math.abs(batteryPowerKw) * durationHours;
        const wearCost = throughputKwh * request.batteryWearCostPerKwh;
        const cost = state.cost + grid.cost + wearCost;
        const key = quantizeEnergy(nextEnergy);
        const existing = nextLayer.get(key);

        if (!existing || cost < existing.cost - EPSILON) {
          nextLayer.set(key, {
            storedEnergyKwh: nextEnergy,
            cost,
            parentKey,
            batteryPowerKw
          });
        }
      }
    }

    if (nextLayer.size === 0) {
      return invalid('Nie znaleziono wykonalnego przebiegu SoC.', crossesMidnight);
    }
    layers.push(nextLayer);
  }

  let finalKey: number | null = null;
  let finalNode: StateNode | null = null;
  for (const [key, node] of layers[layers.length - 1]) {
    if (node.storedEnergyKwh < targetEndEnergy - EPSILON) continue;
    if (!finalNode || node.cost < finalNode.cost - EPSILON) {
      finalKey = key;
      finalNode = node;
    }
  }
  if (finalKey === null || !finalNode) {
    return invalid('Nie da się osiągnąć wymaganego końcowego SoC.', crossesMidnight);
  }

  const timeline: BatteryArbitrageStep[] = [];
  let key = finalKey;
  for (let index = intervals.length - 1; index >= 0; index--) {
    const interval = intervals[index];
    const node = layers[index + 1].get(key);
    if (!node || node.parentKey === null) return invalid('Nie udało się odtworzyć harmonogramu.', crossesMidnight);
    const parent = layers[index].get(node.parentKey);
    if (!parent) return invalid('Nie udało się odtworzyć stanu baterii.', crossesMidnight);

    const durationHours = interval.durationMinutes / 60;
    const netGridKwh = (interval.householdLoadKw - interval.pvGenerationKw + node.batteryPowerKw) * durationHours;
    const grid = gridEnergyCost(netGridKwh, interval.pricePerKwh, request.allowExport, request.exportPriceFactor);
    const throughputKwh = Math.abs(node.batteryPowerKw) * durationHours;
    const wearCost = throughputKwh * request.batteryWearCostPerKwh;

    timeline.push({
      start: interval.start,
      end: endTime(interval),
      date: interval.date ?? null,
      action: node.batteryPowerKw > EPSILON ? 'charge' : node.batteryPowerKw < -EPSILON ? 'discharge' : 'idle',
      batteryPowerKw: node.batteryPowerKw,
      socStartPercent: parent.storedEnergyKwh / capacity * 100,
      socEndPercent: node.storedEnergyKwh / capacity * 100,
      gridImportKwh: grid.importKwh,
      gridExportKwh: grid.exportKwh,
      pvGenerationKwh: interval.pvGenerationKw * durationHours,
      householdLoadKwh: interval.householdLoadKw * durationHours,
      energyPricePlnKwh: interval.pricePerKwh,
      energyCostPln: grid.cost,
      wearCostPln: wearCost,
      netCostPln: grid.cost + wearCost
    });
    key = node.parentKey;
  }
  timeline.reverse();

  const totalGridImportKwh = timeline.reduce((sum, item) => sum + item.gridImportKwh, 0);
  const totalGridExportKwh = timeline.reduce((sum, item) => sum + item.gridExportKwh, 0);
  const totalChargedKwh = timeline.reduce((sum, item) => sum + Math.max(0, item.batteryPowerKw) * ((timeToMinutes(item.end) || MINUTES_PER_DAY) - timeToMinutes(item.start)) / 60, 0);
  const totalDischargedKwh = timeline.reduce((sum, item) => sum + Math.max(0, -item.batteryPowerKw) * ((timeToMinutes(item.end) || MINUTES_PER_DAY) - timeToMinutes(item.start)) / 60, 0);

  return {
    feasible: true,
    reason: null,
    timeline,
    activeSteps: timeline.filter((item) => item.action !== 'idle'),
    baselineCostPln,
    optimizedCostPln: finalNode.cost,
    savingsPln: baselineCostPln - finalNode.cost,
    totalGridImportKwh,
    totalGridExportKwh,
    totalChargedKwh,
    totalDischargedKwh,
    endSocPercent: finalNode.storedEnergyKwh / capacity * 100,
    crossesMidnight
  };
}

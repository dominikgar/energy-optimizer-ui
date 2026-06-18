export type ExecutionEnergySource = 'reported' | 'meter_delta' | 'power_duration';

export interface ExecutionEnergyInput {
  reportedEnergyKwh?: number | null;
  meterStartKwh?: number | null;
  meterEndKwh?: number | null;
  powerKw?: number | null;
  durationHours: number;
}

export interface ExecutionEnergyResult {
  valid: boolean;
  error: string | null;
  energyKwh: number | null;
  source: ExecutionEnergySource | null;
  estimated: boolean;
}

function positiveFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function nonNegativeFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function resolveExecutionEnergy(input: ExecutionEnergyInput): ExecutionEnergyResult {
  if (!Number.isFinite(input.durationHours) || input.durationHours <= 0 || input.durationHours > 48) {
    return {
      valid: false,
      error: 'Czas wykonania musi być większy od 0 i nie dłuższy niż 48 godzin.',
      energyKwh: null,
      source: null,
      estimated: false
    };
  }

  if (positiveFinite(input.reportedEnergyKwh)) {
    return {
      valid: true,
      error: null,
      energyKwh: input.reportedEnergyKwh,
      source: 'reported',
      estimated: false
    };
  }

  if (nonNegativeFinite(input.meterStartKwh) && nonNegativeFinite(input.meterEndKwh)) {
    const delta = input.meterEndKwh - input.meterStartKwh;
    if (delta > 0) {
      return {
        valid: true,
        error: null,
        energyKwh: delta,
        source: 'meter_delta',
        estimated: false
      };
    }
  }

  if (positiveFinite(input.powerKw)) {
    return {
      valid: true,
      error: null,
      energyKwh: input.powerKw * input.durationHours,
      source: 'power_duration',
      estimated: true
    };
  }

  return {
    valid: false,
    error: 'Podaj energy_kwh, licznik końcowy meter_end_kwh albo moc power_kw do estymacji.',
    energyKwh: null,
    source: null,
    estimated: false
  };
}

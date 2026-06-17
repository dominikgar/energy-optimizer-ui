export interface DeviceModelResult {
  valid: boolean;
  error: string | null;
  energyRequiredKwh: number;
  maxPowerKw: number;
  details: Record<string, number>;
}

export interface HeatPumpModelInput {
  thermalDemandKwh: number;
  cop: number;
  maxElectricalPowerKw: number;
  reservePercent: number;
}

export interface BatteryChargeModelInput {
  usableCapacityKwh: number;
  currentSocPercent: number;
  targetSocPercent: number;
  maxChargePowerKw: number;
  chargeEfficiencyPercent: number;
}

function invalid(error: string): DeviceModelResult {
  return {
    valid: false,
    error,
    energyRequiredKwh: 0,
    maxPowerKw: 0,
    details: {}
  };
}

export function calculateHeatPumpModel(input: HeatPumpModelInput): DeviceModelResult {
  if (!Number.isFinite(input.thermalDemandKwh) || input.thermalDemandKwh <= 0) {
    return invalid('Zapotrzebowanie na ciepło musi być większe od zera.');
  }
  if (!Number.isFinite(input.cop) || input.cop < 1 || input.cop > 10) {
    return invalid('COP musi mieścić się w zakresie od 1 do 10.');
  }
  if (!Number.isFinite(input.maxElectricalPowerKw) || input.maxElectricalPowerKw <= 0) {
    return invalid('Maksymalna moc elektryczna musi być większa od zera.');
  }
  if (!Number.isFinite(input.reservePercent) || input.reservePercent < 0 || input.reservePercent > 100) {
    return invalid('Rezerwa musi mieścić się w zakresie od 0 do 100%.');
  }

  const thermalEnergyWithReserve = input.thermalDemandKwh * (1 + input.reservePercent / 100);
  const energyRequiredKwh = thermalEnergyWithReserve / input.cop;

  return {
    valid: true,
    error: null,
    energyRequiredKwh,
    maxPowerKw: input.maxElectricalPowerKw,
    details: {
      thermalDemandKwh: input.thermalDemandKwh,
      thermalEnergyWithReserveKwh: thermalEnergyWithReserve,
      cop: input.cop,
      reservePercent: input.reservePercent
    }
  };
}

export function calculateBatteryChargeModel(input: BatteryChargeModelInput): DeviceModelResult {
  if (!Number.isFinite(input.usableCapacityKwh) || input.usableCapacityKwh <= 0) {
    return invalid('Pojemność użyteczna magazynu musi być większa od zera.');
  }
  if (!Number.isFinite(input.currentSocPercent) || input.currentSocPercent < 0 || input.currentSocPercent > 100) {
    return invalid('Aktualny poziom naładowania musi mieścić się w zakresie od 0 do 100%.');
  }
  if (!Number.isFinite(input.targetSocPercent) || input.targetSocPercent < 0 || input.targetSocPercent > 100) {
    return invalid('Docelowy poziom naładowania musi mieścić się w zakresie od 0 do 100%.');
  }
  if (input.targetSocPercent <= input.currentSocPercent) {
    return invalid('Docelowy poziom naładowania musi być wyższy od aktualnego.');
  }
  if (!Number.isFinite(input.maxChargePowerKw) || input.maxChargePowerKw <= 0) {
    return invalid('Maksymalna moc ładowania musi być większa od zera.');
  }
  if (!Number.isFinite(input.chargeEfficiencyPercent) || input.chargeEfficiencyPercent <= 0 || input.chargeEfficiencyPercent > 100) {
    return invalid('Sprawność ładowania musi mieścić się w zakresie od 0 do 100%.');
  }

  const storedEnergyKwh = input.usableCapacityKwh
    * (input.targetSocPercent - input.currentSocPercent)
    / 100;
  const energyRequiredKwh = storedEnergyKwh / (input.chargeEfficiencyPercent / 100);

  return {
    valid: true,
    error: null,
    energyRequiredKwh,
    maxPowerKw: input.maxChargePowerKw,
    details: {
      usableCapacityKwh: input.usableCapacityKwh,
      currentSocPercent: input.currentSocPercent,
      targetSocPercent: input.targetSocPercent,
      storedEnergyKwh,
      chargeEfficiencyPercent: input.chargeEfficiencyPercent
    }
  };
}

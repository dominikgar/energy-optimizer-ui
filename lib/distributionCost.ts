export interface DistributionConfig {
  variableRatePerKwh: number;
  additionalVariableRatePerKwh: number;
  monthlyFixedFee: number;
  monthlyCapacityFee: number;
  vatPercent: number;
}

export interface DistributionCostBreakdown {
  consumptionKwh: number;
  variableDistributionCost: number;
  additionalVariableCost: number;
  proratedFixedFee: number;
  proratedCapacityFee: number;
  netSubtotal: number;
  vatCost: number;
  totalCost: number;
  averageCostPerKwh: number;
}

const AVERAGE_DAYS_PER_MONTH = 365.2425 / 12;

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function prorateMonthly(value: number, periodDays: number): number {
  const safeValue = Math.max(0, finiteOrZero(value));
  const safePeriodDays = Math.max(0, finiteOrZero(periodDays));
  return safeValue * (safePeriodDays / AVERAGE_DAYS_PER_MONTH);
}

export function calculateDistributionCost(
  consumptionKwh: number,
  config: DistributionConfig,
  periodDays: number
): DistributionCostBreakdown {
  const safeConsumptionKwh = Math.max(0, finiteOrZero(consumptionKwh));
  const variableRate = Math.max(0, finiteOrZero(config.variableRatePerKwh));
  const additionalVariableRate = Math.max(0, finiteOrZero(config.additionalVariableRatePerKwh));
  const vatRate = Math.max(0, finiteOrZero(config.vatPercent)) / 100;

  const variableDistributionCost = safeConsumptionKwh * variableRate;
  const additionalVariableCost = safeConsumptionKwh * additionalVariableRate;
  const proratedFixedFee = prorateMonthly(config.monthlyFixedFee, periodDays);
  const proratedCapacityFee = prorateMonthly(config.monthlyCapacityFee, periodDays);
  const netSubtotal = variableDistributionCost
    + additionalVariableCost
    + proratedFixedFee
    + proratedCapacityFee;
  const vatCost = netSubtotal * vatRate;
  const totalCost = netSubtotal + vatCost;

  return {
    consumptionKwh: safeConsumptionKwh,
    variableDistributionCost,
    additionalVariableCost,
    proratedFixedFee,
    proratedCapacityFee,
    netSubtotal,
    vatCost,
    totalCost,
    averageCostPerKwh: safeConsumptionKwh > 0 ? totalCost / safeConsumptionKwh : 0
  };
}

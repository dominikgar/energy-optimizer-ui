export interface ConsumptionPricePoint {
  kwh: number;
  marketPricePerKwh: number;
}

export interface DynamicOfferConfig {
  marketMultiplier: number;
  marginPerKwh: number;
  variableFeePerKwh: number;
  monthlyFee: number;
  vatPercent: number;
  floorNegativeMarketPricesAtZero: boolean;
}

export interface DynamicCostBreakdown {
  consumptionKwh: number;
  marketEnergyCost: number;
  marginCost: number;
  variableFeeCost: number;
  proratedMonthlyFee: number;
  netSubtotal: number;
  vatCost: number;
  totalCost: number;
  averageCostPerKwh: number;
}

const AVERAGE_DAYS_PER_MONTH = 365.2425 / 12;

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function calculateFixedRateCost(
  points: ConsumptionPricePoint[],
  grossRatePerKwh: number
): number {
  const rate = Math.max(0, finiteOrZero(grossRatePerKwh));
  return points.reduce((total, point) => total + Math.max(0, finiteOrZero(point.kwh)) * rate, 0);
}

export function calculateDynamicOfferCost(
  points: ConsumptionPricePoint[],
  config: DynamicOfferConfig,
  periodDays: number
): DynamicCostBreakdown {
  const multiplier = Math.max(0, finiteOrZero(config.marketMultiplier));
  const marginPerKwh = finiteOrZero(config.marginPerKwh);
  const variableFeePerKwh = finiteOrZero(config.variableFeePerKwh);
  const monthlyFee = Math.max(0, finiteOrZero(config.monthlyFee));
  const vatRate = Math.max(0, finiteOrZero(config.vatPercent)) / 100;
  const safePeriodDays = Math.max(0, finiteOrZero(periodDays));

  let consumptionKwh = 0;
  let marketEnergyCost = 0;

  for (const point of points) {
    const kwh = Math.max(0, finiteOrZero(point.kwh));
    const rawMarketPrice = finiteOrZero(point.marketPricePerKwh);
    const marketPrice = config.floorNegativeMarketPricesAtZero
      ? Math.max(0, rawMarketPrice)
      : rawMarketPrice;

    consumptionKwh += kwh;
    marketEnergyCost += kwh * marketPrice * multiplier;
  }

  const marginCost = consumptionKwh * marginPerKwh;
  const variableFeeCost = consumptionKwh * variableFeePerKwh;
  const proratedMonthlyFee = monthlyFee * (safePeriodDays / AVERAGE_DAYS_PER_MONTH);
  const netSubtotal = marketEnergyCost + marginCost + variableFeeCost + proratedMonthlyFee;
  const vatCost = netSubtotal * vatRate;
  const totalCost = netSubtotal + vatCost;

  return {
    consumptionKwh,
    marketEnergyCost,
    marginCost,
    variableFeeCost,
    proratedMonthlyFee,
    netSubtotal,
    vatCost,
    totalCost,
    averageCostPerKwh: consumptionKwh > 0 ? totalCost / consumptionKwh : 0
  };
}

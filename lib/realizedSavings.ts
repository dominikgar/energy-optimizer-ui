export interface RealizedSavingsInput {
  energyKwh: number;
  averageMarketPricePlnKwh: number;
  referenceRatePlnKwh: number;
}

export interface RealizedSavingsResult {
  valid: boolean;
  error: string | null;
  actualMarketCostPln: number;
  referenceCostPln: number;
  savingsPln: number;
  savingsPercent: number | null;
}

export function calculateRealizedSavings(input: RealizedSavingsInput): RealizedSavingsResult {
  if (!Number.isFinite(input.energyKwh) || input.energyKwh <= 0) {
    return {
      valid: false,
      error: 'Zużyta energia musi być większa od zera.',
      actualMarketCostPln: 0,
      referenceCostPln: 0,
      savingsPln: 0,
      savingsPercent: null
    };
  }
  if (!Number.isFinite(input.averageMarketPricePlnKwh)) {
    return {
      valid: false,
      error: 'Średnia cena rynkowa jest nieprawidłowa.',
      actualMarketCostPln: 0,
      referenceCostPln: 0,
      savingsPln: 0,
      savingsPercent: null
    };
  }
  if (!Number.isFinite(input.referenceRatePlnKwh) || input.referenceRatePlnKwh < 0) {
    return {
      valid: false,
      error: 'Stawka odniesienia nie może być ujemna.',
      actualMarketCostPln: 0,
      referenceCostPln: 0,
      savingsPln: 0,
      savingsPercent: null
    };
  }

  const actualMarketCostPln = input.energyKwh * input.averageMarketPricePlnKwh;
  const referenceCostPln = input.energyKwh * input.referenceRatePlnKwh;
  const savingsPln = referenceCostPln - actualMarketCostPln;
  const savingsPercent = referenceCostPln > 0
    ? savingsPln / referenceCostPln * 100
    : null;

  return {
    valid: true,
    error: null,
    actualMarketCostPln,
    referenceCostPln,
    savingsPln,
    savingsPercent
  };
}

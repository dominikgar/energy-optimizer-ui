import { calculateRealizedSavings } from './realizedSavings';

export interface AwaitingExecutionFinalizationInput {
  energyKwh: unknown;
  referenceRatePlnKwh: unknown;
  averageMarketPricePlnKwh: unknown;
  sampleCount: unknown;
}

export type AwaitingExecutionFinalizationDecision =
  | { status: 'awaiting_prices' }
  | { status: 'invalid'; error: string }
  | {
      status: 'ready';
      energyKwh: number;
      referenceRatePlnKwh: number;
      averageMarketPricePlnKwh: number;
      actualMarketCostPln: number;
      referenceCostPln: number;
      savingsPln: number;
    };

export function prepareAwaitingExecutionFinalization(
  input: AwaitingExecutionFinalizationInput
): AwaitingExecutionFinalizationDecision {
  const sampleCount = Number(input.sampleCount || 0);
  const averageMarketPricePlnKwh = Number(input.averageMarketPricePlnKwh);

  if (sampleCount <= 0 || !Number.isFinite(averageMarketPricePlnKwh)) {
    return { status: 'awaiting_prices' };
  }

  const energyKwh = Number(input.energyKwh);
  const referenceRatePlnKwh = Number(input.referenceRatePlnKwh);
  const savings = calculateRealizedSavings({
    energyKwh,
    averageMarketPricePlnKwh,
    referenceRatePlnKwh
  });

  if (!savings.valid) {
    return {
      status: 'invalid',
      error: savings.error || 'Nie można wyliczyć oszczędności.'
    };
  }

  return {
    status: 'ready',
    energyKwh,
    referenceRatePlnKwh,
    averageMarketPricePlnKwh,
    actualMarketCostPln: savings.actualMarketCostPln,
    referenceCostPln: savings.referenceCostPln,
    savingsPln: savings.savingsPln
  };
}

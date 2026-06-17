export interface ProSubscriptionState {
  is_active?: boolean | null;
  current_period_end?: string | Date | null;
}

export function hasProAccess(subscription: ProSubscriptionState | null | undefined): boolean {
  return Boolean(subscription?.is_active);
}

export function hasStalePeriodMetadata(
  subscription: ProSubscriptionState | null | undefined,
  now = new Date()
): boolean {
  if (!subscription?.is_active || !subscription.current_period_end) return false;
  const periodEnd = new Date(subscription.current_period_end);
  return !Number.isNaN(periodEnd.getTime()) && periodEnd < now;
}

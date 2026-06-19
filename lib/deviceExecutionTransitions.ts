export type DeviceExecutionStatus = 'running' | 'awaiting_prices' | 'completed' | 'cancelled';

export type StartCollisionDecision = 'return_existing' | 'conflict';
export type StopTransitionDecision = 'process' | 'return_completed' | 'reject_cancelled';
export type CancelTransitionDecision = 'cancel' | 'return_cancelled' | 'reject_completed';

export function decideStartCollision(status: DeviceExecutionStatus): StartCollisionDecision {
  return status === 'running' ? 'return_existing' : 'conflict';
}

export function decideStopTransition(status: DeviceExecutionStatus): StopTransitionDecision {
  if (status === 'completed') return 'return_completed';
  if (status === 'cancelled') return 'reject_cancelled';
  return 'process';
}

export function decideCancelTransition(status: DeviceExecutionStatus): CancelTransitionDecision {
  if (status === 'completed') return 'reject_completed';
  if (status === 'cancelled') return 'return_cancelled';
  return 'cancel';
}

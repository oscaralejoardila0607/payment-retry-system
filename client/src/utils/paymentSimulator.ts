/**
 * Payment Simulation Logic
 * Simulates realistic payment processing with various outcomes
 */

import type { PaymentProcessor, FailureType } from '../types/api.types';

interface SimulationConfig {
  processor: PaymentProcessor;
  amount: number;
  attemptNumber: number;
  lastFailureType?: FailureType;
  timeSinceLastAttempt?: number; // in milliseconds
}

interface SimulationResult {
  success: boolean;
  failureType?: FailureType;
  failureReason?: string;
}

/**
 * Realistic failure rates by processor
 */
const PROCESSOR_FAILURE_RATES = {
  stripe: 0.15,    // 15% failure rate
  pse: 0.25,       // 25% failure rate
  nequi: 0.20,     // 20% failure rate
};

/**
 * Failure type distributions
 */
const FAILURE_TYPES_WEIGHTS: Record<FailureType, number> = {
  insufficient_funds: 0.40,      // 40%
  card_declined: 0.25,           // 25%
  network_timeout: 0.15,         // 15%
  processor_downtime: 0.10,      // 10%
  invalid_card_details: 0.07,    // 7%
  card_stolen: 0.03,             // 3%
};

/**
 * Calculate success probability improvement based on time delay and failure type
 */
function calculateRetrySuccessProbability(config: SimulationConfig): number {
  const { lastFailureType, timeSinceLastAttempt = 0, attemptNumber } = config;

  let baseProbability = 0.20; // 20% base retry success

  // Improve probability based on failure type
  if (lastFailureType === 'insufficient_funds') {
    baseProbability = 0.30; // 30% for insufficient funds (customer might add funds)
  } else if (lastFailureType === 'network_timeout') {
    baseProbability = 0.70; // 70% for network issues (likely temporary)
  } else if (lastFailureType === 'processor_downtime') {
    baseProbability = 0.80; // 80% for processor downtime (temporary issue)
  } else if (lastFailureType === 'card_declined') {
    baseProbability = 0.25; // 25% for card declined
  }

  // Improve probability based on time delay
  const hoursDelay = timeSinceLastAttempt / (1000 * 60 * 60);
  if (hoursDelay >= 24) {
    baseProbability += 0.20; // +20% after 24 hours
  } else if (hoursDelay >= 12) {
    baseProbability += 0.15; // +15% after 12 hours
  } else if (hoursDelay >= 1) {
    baseProbability += 0.10; // +10% after 1 hour
  }

  // Decrease probability for multiple failed attempts
  const attemptPenalty = (attemptNumber - 1) * 0.05;
  baseProbability -= attemptPenalty;

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, baseProbability));
}

/**
 * Select a random failure type based on weights
 */
function selectRandomFailureType(): FailureType {
  const rand = Math.random();
  let cumulative = 0;

  for (const [type, weight] of Object.entries(FAILURE_TYPES_WEIGHTS)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return type as FailureType;
    }
  }

  return 'card_declined'; // fallback
}

/**
 * Get failure reason message
 */
function getFailureReason(failureType: FailureType): string {
  const reasons: Record<FailureType, string> = {
    insufficient_funds: 'Card has insufficient funds available',
    card_declined: 'Card was declined by the issuing bank',
    network_timeout: 'Network timeout occurred during processing',
    processor_downtime: 'Payment processor is experiencing downtime',
    invalid_card_details: 'Invalid card number, CVV, or expiration date',
    card_stolen: 'Card has been reported as stolen or fraudulent',
  };

  return reasons[failureType];
}

/**
 * Simulate a payment attempt
 */
export function simulatePayment(config: SimulationConfig): SimulationResult {
  const { processor, attemptNumber, lastFailureType } = config;

  // If this is a retry, calculate improved success probability
  if (attemptNumber > 1 && lastFailureType) {
    const retrySuccessProbability = calculateRetrySuccessProbability(config);
    const rand = Math.random();

    if (rand < retrySuccessProbability) {
      return { success: true };
    }

    // Failed again - might be same or different failure
    const useSameFailure = Math.random() < 0.7; // 70% chance of same failure
    const failureType = useSameFailure ? lastFailureType : selectRandomFailureType();

    return {
      success: false,
      failureType,
      failureReason: getFailureReason(failureType),
    };
  }

  // First attempt - use processor failure rate
  const failureRate = PROCESSOR_FAILURE_RATES[processor];
  const rand = Math.random();

  if (rand < failureRate) {
    // Payment failed
    const failureType = selectRandomFailureType();
    return {
      success: false,
      failureType,
      failureReason: getFailureReason(failureType),
    };
  }

  // Payment succeeded
  return { success: true };
}

/**
 * Force a specific outcome (for testing)
 */
export function simulatePaymentForced(
  outcome: 'success' | 'failure',
  failureType?: FailureType
): SimulationResult {
  if (outcome === 'success') {
    return { success: true };
  }

  const type = failureType || 'insufficient_funds';
  return {
    success: false,
    failureType: type,
    failureReason: getFailureReason(type),
  };
}

/**
 * unused parameter for future use
 * @param _timeSinceLastAttempt - Time since last attempt
 */

/**
 * Generate a unique transaction ID
 */
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `txn_${timestamp}${random}`;
}

/**
 * Calculate time-based success probability for display
 */
export function calculateDisplayProbability(
  failureType: FailureType,
  hoursDelay: number
): number {
  return calculateRetrySuccessProbability({
    processor: 'stripe',
    amount: 0,
    attemptNumber: 2,
    lastFailureType: failureType,
    timeSinceLastAttempt: hoursDelay * 60 * 60 * 1000,
  });
}

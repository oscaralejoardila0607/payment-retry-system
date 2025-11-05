/**
 * Failure Type Classification Rules
 * Defines retry strategies for different payment failure types
 */

const FAILURE_RULES = {
  insufficient_funds: {
    shouldRetry: true,
    retryStrategy: 'delayed',
    retryIntervals: [3600, 43200, 86400], // 1h, 12h, 24h (seconds)
    maxRetries: 3,
    successProbability: 0.20,
    category: 'retryable_with_delay',
    description: 'Card has insufficient funds',
  },
  card_declined: {
    shouldRetry: true,
    retryStrategy: 'limited',
    retryIntervals: [300, 3600], // 5min, 1h
    maxRetries: 2,
    successProbability: 0.15,
    category: 'retryable_with_delay',
    description: 'Card declined by issuer',
  },
  network_timeout: {
    shouldRetry: true,
    retryStrategy: 'immediate',
    retryIntervals: [0, 60, 300], // immediate, 1min, 5min
    maxRetries: 3,
    successProbability: 0.60,
    category: 'retryable_immediate',
    description: 'Network timeout or connection issue',
  },
  processor_downtime: {
    shouldRetry: true,
    retryStrategy: 'delayed',
    retryIntervals: [600, 1800], // 10min, 30min
    maxRetries: 2,
    successProbability: 0.80,
    category: 'retryable_with_delay',
    description: 'Payment processor is experiencing downtime',
  },
  invalid_card_details: {
    shouldRetry: false,
    retryStrategy: null,
    retryIntervals: [],
    maxRetries: 0,
    successProbability: 0.0,
    category: 'non_retryable_customer_action',
    description: 'Invalid card number, CVV, or expiration date',
  },
  card_stolen: {
    shouldRetry: false,
    retryStrategy: null,
    retryIntervals: [],
    maxRetries: 0,
    successProbability: 0.0,
    category: 'non_retryable_security',
    description: 'Card reported as stolen or fraudulent',
  },
};

/**
 * Rate limits per payment processor
 */
const RATE_LIMITS = {
  stripe: { maxRetries: 5, windowHours: 24 },
  pse: { maxRetries: 3, windowHours: 12 },
  nequi: { maxRetries: 4, windowHours: 24 },
  default: { maxRetries: 3, windowHours: 24 },
};

/**
 * Retry fees per payment processor in COP (Colombian Pesos)
 * These costs represent the operational cost per retry attempt for each processor
 *
 * NOTE: These are placeholder values and should be updated with real costs from:
 * - Contract agreements with payment processors
 * - Operational costs (API calls, infrastructure)
 * - Opportunity costs (customer friction, time)
 *
 * Current values are estimates for MVP testing purposes
 */
const RETRY_FEES = {
  stripe: 0,        // Stripe includes retries in base fee (no additional cost)
  pse: 1200,        // PSE charges per retry attempt (~1,200 COP estimated)
  nequi: 800,       // Nequi operational cost per retry (~800 COP estimated)
  default: 150,     // Default fallback for unknown processors
};

/**
 * Default retry fee per attempt in COP (Colombian Pesos)
 * @deprecated Use RETRY_FEES object instead for processor-specific fees
 */
const DEFAULT_RETRY_FEE = parseInt(process.env.RETRY_FEE_COP || '150', 10);

module.exports = {
  FAILURE_RULES,
  RATE_LIMITS,
  RETRY_FEES,
  DEFAULT_RETRY_FEE,
};

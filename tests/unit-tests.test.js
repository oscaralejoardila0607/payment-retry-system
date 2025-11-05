/**
 * Unit Tests for Retry Intelligence Services
 */

const { analyzeFailure } = require('../src/services/failure-analyzer');
const { generateRetrySchedule } = require('../src/services/retry-strategy');
const { checkRateLimit } = require('../src/services/rate-limiter');
const { calculateROI } = require('../src/utils/cost-calculator');
const { predictRetrySuccess, getTimeOfDayFactor, getAmountFactor } = require('../src/services/ml-predictor');
const { FAILURE_RULES } = require('../src/config/failure-rules');

describe('Failure Analyzer Service', () => {
  test('should identify retryable failure - insufficient funds', () => {
    const result = analyzeFailure({ failureType: 'insufficient_funds' });

    expect(result.shouldRetry).toBe(true);
    expect(result.category).toBe('retryable_with_delay');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('should identify non-retryable failure - card stolen', () => {
    const result = analyzeFailure({ failureType: 'card_stolen' });

    expect(result.shouldRetry).toBe(false);
    expect(result.category).toBe('non_retryable_security');
    expect(result.riskAssessment).toBe('critical');
  });

  test('should handle unknown failure type', () => {
    const result = analyzeFailure({ failureType: 'unknown_error' });

    expect(result.shouldRetry).toBe(false);
    expect(result.category).toBe('unknown_failure_type');
  });
});

describe('Retry Strategy Service', () => {
  test('should generate retry schedule for immediate strategy', () => {
    const rule = FAILURE_RULES.network_timeout;
    const timestamp = '2025-11-04T10:00:00Z';

    const schedule = generateRetrySchedule(rule, 1, timestamp);

    expect(schedule.maxRetries).toBe(3);
    expect(schedule.remainingRetries).toBe(2); // maxRetries - currentAttempt = 3 - 1 = 2
    expect(schedule.retrySchedule).toHaveLength(2);
    expect(schedule.retrySchedule[0].intervalSeconds).toBe(0); // Immediate
  });

  test('should generate retry schedule for delayed strategy', () => {
    const rule = FAILURE_RULES.insufficient_funds;
    const timestamp = '2025-11-04T10:00:00Z';

    const schedule = generateRetrySchedule(rule, 1, timestamp);

    expect(schedule.maxRetries).toBe(3);
    expect(schedule.retrySchedule[0].intervalSeconds).toBe(3600); // 1 hour
    expect(schedule.retrySchedule[1].intervalSeconds).toBe(43200); // 12 hours
  });

  test('should return empty schedule when no retries remaining', () => {
    const rule = FAILURE_RULES.insufficient_funds;
    const timestamp = '2025-11-04T10:00:00Z';

    const schedule = generateRetrySchedule(rule, 3, timestamp); // Already at max

    expect(schedule.remainingRetries).toBe(0);
    expect(schedule.retrySchedule).toHaveLength(0);
  });
});

describe('Rate Limiter Service', () => {
  test('should check rate limit for Stripe', () => {
    const result = checkRateLimit('4242', 'stripe', 3);

    expect(result.withinLimit).toBe(true);
    expect(result.maxRetries).toBe(5);
    expect(result.remaining).toBe(2);
  });

  test('should detect rate limit exceeded', () => {
    const result = checkRateLimit('4242', 'stripe', 5);

    expect(result.withinLimit).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('should use default limits for unknown processor', () => {
    const result = checkRateLimit('4242', 'unknown_processor', 2);

    expect(result.maxRetries).toBe(3);
    expect(result.remaining).toBe(1);
  });
});

describe('Cost Calculator', () => {
  test('should calculate positive ROI with explicit fee', () => {
    const result = calculateROI(50000, 3, 0.20, null, 150);

    expect(result.totalRetryCost).toBe(450);
    expect(result.potentialRevenue).toBe(50000);
    expect(result.roi).toBeGreaterThan(0);
    expect(result.worthRetrying).toBe(true);
  });

  test('should calculate negative ROI for low success probability', () => {
    const result = calculateROI(1000, 3, 0.01, null, 150);

    expect(result.totalRetryCost).toBe(450);
    expect(result.roi).toBeLessThan(0);
    expect(result.worthRetrying).toBe(false);
  });

  test('should handle zero retry cost with Stripe (no fee)', () => {
    const result = calculateROI(50000, 3, 0.20, 'stripe');

    expect(result.totalRetryCost).toBe(0);
    expect(result.roi).toBe(Infinity);
    expect(result.worthRetrying).toBe(true);
    expect(result.processor).toBe('stripe');
  });

  test('should use processor-specific fee for PSE', () => {
    const result = calculateROI(50000, 3, 0.20, 'pse');

    expect(result.retryFeePerAttempt).toBe(1200);
    expect(result.totalRetryCost).toBe(3600);
    expect(result.processor).toBe('pse');
  });

  test('should use processor-specific fee for Nequi', () => {
    const result = calculateROI(50000, 2, 0.30, 'nequi');

    expect(result.retryFeePerAttempt).toBe(800);
    expect(result.totalRetryCost).toBe(1600);
    expect(result.processor).toBe('nequi');
  });
});

describe('ML Predictor Service', () => {
  test('should enhance success probability based on factors', () => {
    const failureData = {
      amount: 5000,
      timestamp: '2025-11-04T14:00:00Z', // Business hours, weekday
      merchantId: 'mch_test_123',
      cardLastFour: '8888',
    };

    const result = predictRetrySuccess(failureData, 0.20);

    expect(result.adjustedProbability).toBeGreaterThan(result.baseProbability);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.factors).toBeDefined();
  });

  test('should apply time of day factor correctly', () => {
    const businessHour = getTimeOfDayFactor('2025-11-04T14:00:00Z'); // 2 PM
    const nightTime = getTimeOfDayFactor('2025-11-04T02:00:00Z'); // 2 AM

    expect(businessHour).toBe(1.2);
    expect(nightTime).toBe(0.8);
  });

  test('should apply amount factor correctly', () => {
    const smallAmount = getAmountFactor(5000);
    const largeAmount = getAmountFactor(150000);

    expect(smallAmount).toBe(1.3);
    expect(largeAmount).toBe(0.85);
  });

  test('should clamp probability between 0 and 1', () => {
    const failureData = {
      amount: 2000, // Very small - high multiplier
      timestamp: '2025-11-04T14:00:00Z',
      merchantId: 'mch_test_123',
      cardLastFour: '9999',
    };

    const result = predictRetrySuccess(failureData, 0.90);

    expect(result.adjustedProbability).toBeLessThanOrEqual(1.0);
    expect(result.adjustedProbability).toBeGreaterThanOrEqual(0);
  });
});

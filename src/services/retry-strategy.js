/**
 * Retry Strategy Service
 * Generates retry schedules based on failure type and attempt number
 */

/**
 * Generates retry schedule for a transaction
 * @param {Object} rule - Failure rule from config
 * @param {number} currentAttempt - Current attempt number
 * @param {string} timestamp - Current timestamp
 * @param {Object} merchantConfig - Merchant configuration (optional)
 * @returns {Object} Retry schedule with timing and reasoning
 */
function generateRetrySchedule(rule, currentAttempt, timestamp, merchantConfig = {}) {
  const maxRetries = merchantConfig.maxRetries || rule.maxRetries;
  const remainingRetries = Math.max(0, maxRetries - currentAttempt);

  if (!rule.shouldRetry || remainingRetries === 0) {
    return {
      nextRetryAt: null,
      retryIntervalSeconds: 0,
      maxRetries,
      currentAttempt,
      remainingRetries: 0,
      retrySchedule: [],
    };
  }

  const retrySchedule = [];
  const baseTime = new Date(timestamp);

  // Generate schedule for remaining retries
  for (let i = 0; i < remainingRetries; i++) {
    const attemptNumber = currentAttempt + i + 1;
    const intervalIndex = Math.min(i, rule.retryIntervals.length - 1);
    const intervalSeconds = rule.retryIntervals[intervalIndex];

    // Calculate scheduled time by adding interval to base time
    const scheduledTime = new Date(baseTime.getTime() + intervalSeconds * 1000);

    retrySchedule.push({
      attemptNumber,
      scheduledAt: scheduledTime.toISOString(),
      intervalSeconds,
      reason: getRetryReason(attemptNumber, maxRetries, rule.retryStrategy),
    });

    // Update base time for next iteration (cumulative delays)
    baseTime.setTime(baseTime.getTime() + intervalSeconds * 1000);
  }

  return {
    nextRetryAt: retrySchedule[0]?.scheduledAt || null,
    retryIntervalSeconds: retrySchedule[0]?.intervalSeconds || 0,
    maxRetries,
    currentAttempt,
    remainingRetries,
    retrySchedule,
  };
}

/**
 * Gets human-readable reason for retry timing
 * @param {number} attemptNumber - Attempt number
 * @param {number} maxRetries - Maximum retries allowed
 * @param {string} strategy - Retry strategy
 * @returns {string} Reason for retry timing
 */
function getRetryReason(attemptNumber, maxRetries, strategy) {
  if (strategy === 'immediate') {
    if (attemptNumber === 2) {
      return 'Immediate retry for transient network issue';
    } else if (attemptNumber === 3) {
      return 'Short delay before next attempt';
    } else {
      return 'Extended delay before final attempt';
    }
  }

  if (strategy === 'delayed') {
    if (attemptNumber === 2) {
      return 'Wait for funds availability or customer action';
    } else if (attemptNumber === 3) {
      return 'Extended delay for customer action';
    } else if (attemptNumber === maxRetries) {
      return 'Final attempt before marking as failed';
    } else {
      return 'Additional delay for optimal success probability';
    }
  }

  if (strategy === 'limited') {
    if (attemptNumber === 2) {
      return 'Quick retry after brief delay';
    } else {
      return 'Final attempt with extended delay';
    }
  }

  return 'Retry attempt';
}

module.exports = {
  generateRetrySchedule,
  getRetryReason,
};

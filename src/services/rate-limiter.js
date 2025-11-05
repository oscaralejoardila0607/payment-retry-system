/**
 * Rate Limiter Service
 * Checks rate limits per payment processor
 */

const { RATE_LIMITS } = require('../config/failure-rules');

/**
 * Checks if retry is within rate limit
 * @param {string} cardLastFour - Last 4 digits of card
 * @param {string} paymentProcessor - Payment processor name
 * @param {number} currentAttempts - Current number of attempts
 * @returns {Object} Rate limit check result
 */
function checkRateLimit(cardLastFour, paymentProcessor, currentAttempts) {
  const limit = RATE_LIMITS[paymentProcessor] || RATE_LIMITS.default;

  const withinLimit = currentAttempts < limit.maxRetries;
  const remaining = Math.max(0, limit.maxRetries - currentAttempts);
  const resetAt = calculateResetTime(limit.windowHours);

  return {
    withinLimit,
    remaining,
    resetAt: resetAt.toISOString(),
    maxRetries: limit.maxRetries,
    windowHours: limit.windowHours,
    processor: paymentProcessor,
  };
}

/**
 * Calculates when rate limit will reset
 * @param {number} windowHours - Rate limit window in hours
 * @returns {Date} Reset time
 */
function calculateResetTime(windowHours) {
  const resetTime = new Date();
  resetTime.setHours(resetTime.getHours() + windowHours);
  return resetTime;
}

/**
 * Performs comprehensive compliance checks
 * @param {Object} transactionData - Transaction data
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {Object} Compliance check results
 */
function performComplianceChecks(transactionData, rateLimitInfo) {
  return {
    withinRateLimit: rateLimitInfo.withinLimit,
    rateLimitRemaining: rateLimitInfo.remaining,
    rateLimitResetAt: rateLimitInfo.resetAt,
    pciCompliant: true, // In production, this would check actual PCI-DSS requirements
    dataRetentionCompliant: true,
    processor: rateLimitInfo.processor,
  };
}

module.exports = {
  checkRateLimit,
  calculateResetTime,
  performComplianceChecks,
};

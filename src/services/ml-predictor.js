/**
 * ML Predictor Service (BONUS)
 * Predicts retry success probability using multiple factors
 */

/**
 * Predicts retry success probability with enhanced factors
 * @param {Object} failureData - Failed transaction data
 * @param {number} baseSuccessRate - Base success rate from failure rules
 * @returns {Object} Enhanced prediction with adjusted probability
 */
function predictRetrySuccess(failureData, baseSuccessRate) {
  const factors = {
    timeOfDay: getTimeOfDayFactor(failureData.timestamp),
    dayOfWeek: getDayOfWeekFactor(failureData.timestamp),
    transactionAmount: getAmountFactor(failureData.amount),
    merchantCategory: getMerchantCategoryFactor(failureData.merchantId),
    historicalSuccess: getHistoricalSuccessFactor(failureData.cardLastFour),
  };

  // Weighted adjustment (total weight = 0.5 for 50% max adjustment)
  const adjustment =
    (factors.timeOfDay - 1) * 0.1 +
    (factors.dayOfWeek - 1) * 0.08 +
    (factors.transactionAmount - 1) * 0.12 +
    (factors.merchantCategory - 1) * 0.05 +
    (factors.historicalSuccess - 1) * 0.15;

  const adjustedProbability = baseSuccessRate * (1 + adjustment);

  // Clamp between 0 and 1
  const finalProbability = Math.min(Math.max(adjustedProbability, 0), 1);

  return {
    baseProbability: baseSuccessRate,
    adjustedProbability: parseFloat(finalProbability.toFixed(3)),
    confidence: calculateConfidence(factors),
    factors: {
      timeOfDay: {
        factor: parseFloat(factors.timeOfDay.toFixed(2)),
        impact: parseFloat(((factors.timeOfDay - 1) * 10).toFixed(1)) + '%',
      },
      dayOfWeek: {
        factor: parseFloat(factors.dayOfWeek.toFixed(2)),
        impact: parseFloat(((factors.dayOfWeek - 1) * 8).toFixed(1)) + '%',
      },
      transactionAmount: {
        factor: parseFloat(factors.transactionAmount.toFixed(2)),
        impact: parseFloat(((factors.transactionAmount - 1) * 12).toFixed(1)) + '%',
      },
      merchantCategory: {
        factor: parseFloat(factors.merchantCategory.toFixed(2)),
        impact: parseFloat(((factors.merchantCategory - 1) * 5).toFixed(1)) + '%',
      },
      historicalSuccess: {
        factor: parseFloat(factors.historicalSuccess.toFixed(2)),
        impact: parseFloat(((factors.historicalSuccess - 1) * 15).toFixed(1)) + '%',
      },
    },
  };
}

/**
 * Time of day factor (higher success during business hours)
 * @param {string} timestamp - ISO timestamp
 * @returns {number} Factor multiplier (0.8-1.2)
 */
function getTimeOfDayFactor(timestamp) {
  const hour = new Date(timestamp).getUTCHours();
  if (hour >= 9 && hour <= 18) return 1.2; // Business hours
  if (hour >= 6 && hour <= 21) return 1.0; // Extended hours
  return 0.8; // Night time
}

/**
 * Day of week factor (higher success on weekdays)
 * @param {string} timestamp - ISO timestamp
 * @returns {number} Factor multiplier (0.9-1.1)
 */
function getDayOfWeekFactor(timestamp) {
  const day = new Date(timestamp).getUTCDay();
  if (day >= 1 && day <= 5) return 1.1; // Weekdays
  return 0.9; // Weekends
}

/**
 * Amount factor (smaller amounts have higher success rates)
 * @param {number} amount - Transaction amount
 * @returns {number} Factor multiplier (0.85-1.3)
 */
function getAmountFactor(amount) {
  if (amount < 10000) return 1.3;
  if (amount < 50000) return 1.1;
  if (amount < 100000) return 1.0;
  return 0.85;
}

/**
 * Merchant category factor (simulated based on merchant ID)
 * @param {string} merchantId - Merchant ID
 * @returns {number} Factor multiplier (0.95-1.05)
 */
function getMerchantCategoryFactor(merchantId) {
  // In production, this would look up actual merchant category
  // For now, simulate based on merchant ID hash
  const hash = merchantId ? merchantId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const normalized = (hash % 10) / 10; // 0.0 to 0.9
  return 0.95 + (normalized * 0.1); // 0.95 to 1.05
}

/**
 * Historical success factor (simulated based on card)
 * @param {string} cardLastFour - Last 4 digits of card
 * @returns {number} Factor multiplier (0.85-1.15)
 */
function getHistoricalSuccessFactor(cardLastFour) {
  // In production, this would query historical success rate for this card
  // For now, simulate based on card number
  if (!cardLastFour) return 1.0;
  const cardNum = parseInt(cardLastFour, 10);
  if (cardNum >= 5000) return 1.15; // High success history
  if (cardNum >= 3000) return 1.0;  // Average
  return 0.85; // Lower success history
}

/**
 * Calculates confidence level based on factor variance
 * @param {Object} factors - All prediction factors
 * @returns {number} Confidence level (0.5-1.0)
 */
function calculateConfidence(factors) {
  // Calculate variance from 1.0 (neutral)
  const values = Object.values(factors);
  const variance = values.reduce((sum, val) => sum + Math.abs(val - 1.0), 0) / values.length;

  // Higher variance = lower confidence (but minimum 0.5)
  const confidence = Math.max(0.5, 1.0 - variance);
  return parseFloat(confidence.toFixed(2));
}

module.exports = {
  predictRetrySuccess,
  getTimeOfDayFactor,
  getDayOfWeekFactor,
  getAmountFactor,
  getMerchantCategoryFactor,
  getHistoricalSuccessFactor,
  calculateConfidence,
};

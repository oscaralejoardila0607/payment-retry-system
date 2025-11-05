/**
 * Cost Calculator Utility
 * Calculates cost-benefit analysis for retry attempts
 */

const { DEFAULT_RETRY_FEE, RETRY_FEES } = require('../config/failure-rules');

/**
 * Gets the retry fee for a specific payment processor
 * @param {string} processor - Payment processor name (stripe, pse, nequi)
 * @returns {number} Fee per retry attempt in COP
 */
function getRetryFee(processor) {
  if (!processor) {
    return DEFAULT_RETRY_FEE;
  }

  const processorLower = processor.toLowerCase();
  return RETRY_FEES[processorLower] !== undefined
    ? RETRY_FEES[processorLower]
    : RETRY_FEES.default;
}

/**
 * Calculates ROI for retry attempts
 * @param {number} transactionAmount - Transaction amount
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} successProbability - Probability of success
 * @param {string} processor - Payment processor name (optional)
 * @param {number} retryFee - Fee per retry attempt (optional, overrides processor fee)
 * @returns {Object} Cost analysis with ROI
 */
function calculateROI(transactionAmount, maxRetries, successProbability, processor = null, retryFee = null) {
  // If retryFee is explicitly provided, use it; otherwise get processor-specific fee
  const feePerAttempt = retryFee !== null ? retryFee : getRetryFee(processor);

  const totalRetryCost = feePerAttempt * maxRetries;
  const expectedRevenue = transactionAmount * successProbability;

  // Special case: if retry cost is 0, ROI is infinite (always worth retrying if probability > 0)
  let roi;
  if (totalRetryCost === 0) {
    roi = successProbability > 0 ? Infinity : 0;
  } else {
    roi = ((expectedRevenue - totalRetryCost) / totalRetryCost) * 100;
  }

  return {
    retryFeePerAttempt: feePerAttempt,
    totalRetryCost,
    potentialRevenue: transactionAmount,
    expectedRevenue: parseFloat(expectedRevenue.toFixed(2)),
    roi: roi === Infinity ? Infinity : parseFloat(roi.toFixed(2)),
    worthRetrying: (roi > 0 || roi === Infinity) && successProbability > 0,
    processor: processor || 'default',
  };
}

/**
 * Calculates estimated value of retry attempts
 * @param {number} transactionAmount - Transaction amount
 * @param {number} successProbability - Probability of success
 * @param {number} maxRetries - Maximum retry attempts
 * @param {string} processor - Payment processor name (optional)
 * @returns {Object} Value estimation
 */
function estimateRetryValue(transactionAmount, successProbability, maxRetries, processor = null) {
  const expectedValue = transactionAmount * successProbability;
  const costPerAttempt = getRetryFee(processor);
  const totalCost = costPerAttempt * maxRetries;
  const breakEvenProbability = totalCost > 0 ? totalCost / transactionAmount : 0;

  return {
    expectedValue: parseFloat(expectedValue.toFixed(2)),
    breakEvenProbability: parseFloat(breakEvenProbability.toFixed(4)),
    isProfitable: successProbability > breakEvenProbability,
    profitMargin: parseFloat((expectedValue - totalCost).toFixed(2)),
    costPerAttempt,
    processor: processor || 'default',
  };
}

module.exports = {
  calculateROI,
  estimateRetryValue,
  getRetryFee,
};

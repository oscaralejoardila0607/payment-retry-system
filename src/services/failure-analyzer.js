/**
 * Failure Analyzer Service
 * Analyzes payment failures and determines if they should be retried
 */

const { FAILURE_RULES } = require('../config/failure-rules');

/**
 * Analyzes a failed transaction and returns retry recommendation
 * @param {Object} failureData - Failed transaction data
 * @returns {Object} Analysis result with retry recommendation
 */
function analyzeFailure(failureData) {
  const { failureType } = failureData;

  // Get failure rule for this type
  const rule = FAILURE_RULES[failureType];

  if (!rule) {
    return {
      shouldRetry: false,
      category: 'unknown_failure_type',
      confidence: 0,
      factors: [`Unknown failure type: ${failureType}`],
      riskAssessment: 'high',
    };
  }

  // Build reasoning factors
  const factors = [];

  if (rule.shouldRetry) {
    factors.push(
      `${failureType.replace(/_/g, ' ')} failures have ${(rule.successProbability * 100).toFixed(0)}% success rate on retry`
    );

    if (rule.retryStrategy === 'immediate') {
      factors.push('Immediate retry recommended for transient issues');
    } else if (rule.retryStrategy === 'delayed') {
      factors.push('Customer likely to take action within retry window');
    }
  } else {
    factors.push(
      `0% success rate on historical retries for this failure type`
    );

    if (rule.category === 'non_retryable_security') {
      factors.push('Retrying would violate compliance policies');
    } else if (rule.category === 'non_retryable_customer_action') {
      factors.push('Requires customer to update payment information');
    }
  }

  // Determine risk assessment
  let riskAssessment = 'low';
  if (rule.category === 'non_retryable_security') {
    riskAssessment = 'critical';
  } else if (rule.category === 'non_retryable_customer_action') {
    riskAssessment = 'medium';
  }

  return {
    shouldRetry: rule.shouldRetry,
    category: rule.category,
    confidence: rule.shouldRetry ? 0.85 : 1.0,
    factors,
    riskAssessment,
    rule,
  };
}

/**
 * Gets recommended action for non-retryable failures
 * @param {string} category - Failure category
 * @returns {Object} Recommended action
 */
function getRecommendedAction(category) {
  const actions = {
    non_retryable_security: {
      action: 'contact_customer',
      message: 'Payment method reported as stolen. Please contact customer to update payment information.',
      priority: 'high',
    },
    non_retryable_customer_action: {
      action: 'request_update',
      message: 'Invalid payment details. Please ask customer to verify and update their payment information.',
      priority: 'medium',
    },
    unknown_failure_type: {
      action: 'manual_review',
      message: 'Unknown failure type requires manual review.',
      priority: 'high',
    },
  };

  return actions[category] || {
    action: 'monitor',
    message: 'Monitor transaction and contact support if needed.',
    priority: 'low',
  };
}

module.exports = {
  analyzeFailure,
  getRecommendedAction,
};

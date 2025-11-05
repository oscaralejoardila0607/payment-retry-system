/**
 * Retry Controller
 * Handles retry analysis requests and orchestrates services
 */

const { analyzeFailure, getRecommendedAction } = require('../services/failure-analyzer');
const { generateRetrySchedule } = require('../services/retry-strategy');
const { checkRateLimit, performComplianceChecks } = require('../services/rate-limiter');
const { calculateROI } = require('../utils/cost-calculator');
const { predictRetrySuccess } = require('../services/ml-predictor');
const { validateAnalyzeFailure } = require('../utils/validators');

/**
 * Analyzes a failed payment and returns retry recommendation
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function analyzeFailureController(req, res) {
  try {
    // Validate request
    const { error, value: failureData } = validateAnalyzeFailure(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    // Analyze failure
    const analysis = analyzeFailure(failureData);

    // Check rate limits
    const rateLimitInfo = checkRateLimit(
      failureData.cardLastFour || 'unknown',
      failureData.paymentProcessor,
      failureData.attemptNumber
    );

    // Perform compliance checks
    const complianceChecks = performComplianceChecks(failureData, rateLimitInfo);

    // Check if we're within rate limit
    const withinRateLimit = rateLimitInfo.withinLimit;
    const shouldRetry = analysis.shouldRetry && withinRateLimit;

    // Generate retry schedule if should retry
    let retryRecommendation = null;
    let costAnalysis = null;
    let estimatedSuccessProbability = analysis.rule?.successProbability || 0;

    if (shouldRetry && analysis.rule) {
      // Use ML predictor to enhance success probability
      const mlPrediction = predictRetrySuccess(
        failureData,
        analysis.rule.successProbability
      );
      estimatedSuccessProbability = mlPrediction.adjustedProbability;

      // Generate retry schedule
      const schedule = generateRetrySchedule(
        analysis.rule,
        failureData.attemptNumber,
        failureData.timestamp,
        failureData.merchantConfig
      );

      retryRecommendation = {
        ...schedule,
        mlEnhanced: true,
        predictionDetails: mlPrediction,
      };

      // Calculate cost-benefit analysis with processor-specific fees
      costAnalysis = calculateROI(
        failureData.amount,
        schedule.maxRetries,
        estimatedSuccessProbability,
        failureData.paymentProcessor
      );

      // Add rate limit considerations to factors
      if (rateLimitInfo.remaining <= 1) {
        analysis.factors.push('Near rate limit - this may be final retry attempt');
      }
    } else if (!withinRateLimit) {
      // Rate limit exceeded
      analysis.factors.push(
        `Rate limit exceeded for ${failureData.paymentProcessor} (${rateLimitInfo.maxRetries} max per ${rateLimitInfo.windowHours}h)`
      );
    }

    // Build response
    const response = {
      transactionId: failureData.transactionId,
      shouldRetry,
      retryRecommendation,
      reasoning: {
        failureCategory: analysis.category,
        confidence: analysis.confidence,
        factors: analysis.factors,
        riskAssessment: analysis.riskAssessment,
      },
      estimatedSuccessProbability,
      complianceChecks,
    };

    // Add cost analysis if available
    if (costAnalysis) {
      response.costAnalysis = costAnalysis;
    }

    // Add recommended action for non-retryable failures
    if (!shouldRetry) {
      response.recommendedAction = getRecommendedAction(analysis.category);
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('Error in analyzeFailureController:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while analyzing the failure',
    });
  }
}

/**
 * Health check endpoint
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function healthCheck(req, res) {
  const uptime = process.uptime();

  return res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
  });
}

module.exports = {
  analyzeFailureController,
  healthCheck,
};

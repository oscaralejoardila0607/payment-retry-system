/**
 * Request Validators
 * Validates incoming API requests using Joi
 */

const Joi = require('joi');

/**
 * Schema for analyze-failure endpoint
 */
const analyzeFailureSchema = Joi.object({
  transactionId: Joi.string().required(),
  merchantId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().default('COP'),
  failureType: Joi.string()
    .valid(
      'insufficient_funds',
      'card_declined',
      'network_timeout',
      'processor_downtime',
      'invalid_card_details',
      'card_stolen'
    )
    .required(),
  failureCode: Joi.string().optional(),
  failureReason: Joi.string().optional(),
  timestamp: Joi.string().isoDate().default(() => new Date().toISOString()),
  paymentProcessor: Joi.string()
    .valid('stripe', 'pse', 'nequi')
    .required(),
  cardLastFour: Joi.string().length(4).optional(),
  attemptNumber: Joi.number().integer().min(1).default(1),
  merchantConfig: Joi.object({
    maxRetries: Joi.number().integer().min(0).max(10).optional(),
    enableAutoRetry: Joi.boolean().default(true),
  }).optional(),
});

/**
 * Validates analyze-failure request
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
function validateAnalyzeFailure(data) {
  return analyzeFailureSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}

module.exports = {
  validateAnalyzeFailure,
  analyzeFailureSchema,
};

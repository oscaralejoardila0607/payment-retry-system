/**
 * Retry Routes
 * Defines API routes for retry intelligence endpoints
 */

const express = require('express');
const { analyzeFailureController, healthCheck } = require('../controllers/retry-controller');

const router = express.Router();

/**
 * POST /api/v1/analyze-failure
 * Analyzes a failed payment and returns retry recommendation
 */
router.post('/analyze-failure', analyzeFailureController);

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/health', healthCheck);

module.exports = router;

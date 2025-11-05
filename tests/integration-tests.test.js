/**
 * Integration Tests for API Endpoints
 */

const request = require('supertest');
const app = require('../src/index');

describe('API Integration Tests', () => {
  describe('GET /api/v1/health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/v1/analyze-failure', () => {
    test('should analyze insufficient funds failure - should retry', async () => {
      const payload = {
        transactionId: 'txn_test_001',
        merchantId: 'mch_test_123',
        amount: 50000,
        currency: 'COP',
        failureType: 'insufficient_funds',
        failureCode: 'P001',
        timestamp: '2025-11-04T10:00:00Z',
        paymentProcessor: 'stripe',
        attemptNumber: 1,
      };

      const response = await request(app)
        .post('/api/v1/analyze-failure')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.shouldRetry).toBe(true);
      expect(response.body.retryRecommendation).toBeDefined();
      expect(response.body.retryRecommendation.maxRetries).toBe(3);
      expect(response.body.costAnalysis).toBeDefined();
      expect(response.body.estimatedSuccessProbability).toBeGreaterThan(0);
    });

    test('should analyze network timeout - immediate retry', async () => {
      const payload = {
        transactionId: 'txn_test_002',
        merchantId: 'mch_test_456',
        amount: 30000,
        currency: 'COP',
        failureType: 'network_timeout',
        failureCode: 'N001',
        timestamp: '2025-11-04T10:05:00Z',
        paymentProcessor: 'nequi',
        attemptNumber: 1,
      };

      const response = await request(app)
        .post('/api/v1/analyze-failure')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.shouldRetry).toBe(true);
      expect(response.body.retryRecommendation.retrySchedule[0].intervalSeconds).toBe(0);
      expect(response.body.estimatedSuccessProbability).toBeGreaterThan(0.5);
    });

    test('should reject card stolen - do not retry', async () => {
      const payload = {
        transactionId: 'txn_test_003',
        merchantId: 'mch_test_789',
        amount: 75000,
        currency: 'COP',
        failureType: 'card_stolen',
        failureCode: 'F001',
        timestamp: '2025-11-04T10:10:00Z',
        paymentProcessor: 'pse',
        attemptNumber: 1,
      };

      const response = await request(app)
        .post('/api/v1/analyze-failure')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.shouldRetry).toBe(false);
      expect(response.body.reasoning.failureCategory).toBe('non_retryable_security');
      expect(response.body.recommendedAction).toBeDefined();
      expect(response.body.recommendedAction.action).toBe('contact_customer');
    });

    test('should detect rate limit exceeded', async () => {
      const payload = {
        transactionId: 'txn_test_004',
        merchantId: 'mch_test_999',
        amount: 40000,
        currency: 'COP',
        failureType: 'card_declined',
        failureCode: 'P002',
        timestamp: '2025-11-04T10:15:00Z',
        paymentProcessor: 'stripe',
        attemptNumber: 5,
      };

      const response = await request(app)
        .post('/api/v1/analyze-failure')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.shouldRetry).toBe(false);
      expect(response.body.complianceChecks.withinRateLimit).toBe(false);
    });

    test('should validate request - missing required field', async () => {
      const payload = {
        transactionId: 'txn_test_005',
        amount: 50000,
        // Missing merchantId
      };

      const response = await request(app)
        .post('/api/v1/analyze-failure')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toBeDefined();
    });

    test('should validate request - invalid failure type', async () => {
      const payload = {
        transactionId: 'txn_test_006',
        merchantId: 'mch_test_123',
        amount: 50000,
        failureType: 'invalid_failure_type',
        paymentProcessor: 'stripe',
      };

      const response = await request(app)
        .post('/api/v1/analyze-failure')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    test('should apply ML enhancement for low amount during business hours', async () => {
      const payload = {
        transactionId: 'txn_test_007',
        merchantId: 'mch_test_555',
        amount: 5000,
        currency: 'COP',
        failureType: 'insufficient_funds',
        failureCode: 'P001',
        timestamp: '2025-11-04T14:30:00Z', // Business hours
        paymentProcessor: 'stripe',
        cardLastFour: '8888',
        attemptNumber: 1,
      };

      const response = await request(app)
        .post('/api/v1/analyze-failure')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.shouldRetry).toBe(true);
      expect(response.body.retryRecommendation.mlEnhanced).toBe(true);
      // ML should boost probability above base 0.20
      expect(response.body.estimatedSuccessProbability).toBeGreaterThan(0.20);
    });
  });

  describe('GET /', () => {
    test('should return API information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Novo Retry Intelligence API');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    test('should return 404 for unknown route', async () => {
      const response = await request(app).get('/api/v1/unknown');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });
});

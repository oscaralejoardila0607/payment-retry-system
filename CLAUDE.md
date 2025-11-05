# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Novo Retry Intelligence API** is a RESTful API that analyzes failed payment transactions and provides intelligent retry recommendations for the Novo payment processing platform. The system uses business rules, rate limit compliance, cost-benefit analysis, and ML-enhanced predictions to optimize payment retry decisions.

**Tech Stack:**
- Node.js + Express.js
- Jest for testing
- Joi for validation
- No database (stateless MVP)

**Port:** 4000 (local development)

---

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run in production mode
npm start

# Access API
open http://localhost:4000
```

### Testing
```bash
# Run all tests (unit + integration)
npm test

# Run tests in watch mode
npm run test:watch

# Run only integration tests
npm run test:integration

# Generate coverage report
npm test -- --coverage
```

### Linting
```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### Manual API Testing
```bash
# Import Postman collection from:
postman/novo-retry-api.postman_collection.json

# Or use curl:
curl -X POST http://localhost:4000/api/v1/analyze-failure \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn_test_001",
    "merchantId": "mch_test_123",
    "amount": 50000,
    "currency": "COP",
    "failureType": "insufficient_funds",
    "paymentProcessor": "stripe",
    "attemptNumber": 1
  }'
```

---

## High-Level Architecture

### Request Flow
```
Client Request
    ↓
Express.js App (index.js)
    ↓
Route Handler (retry-routes.js)
    ↓
Controller (retry-controller.js)
    ↓
┌────────────────┴─────────────────┐
│                                   │
Failure Analyzer     Rate Limiter   ML Predictor
    ↓                    ↓               ↓
Retry Strategy      Cost Calculator     │
    ↓                    ↓               │
    └────────────────────┴───────────────┘
                        ↓
                  Response Builder
                        ↓
                   JSON Response
```

### Key Components

1. **Failure Analyzer** (`src/services/failure-analyzer.js`)
   - Classifies 6 failure types: insufficient_funds, card_declined, network_timeout, processor_downtime, invalid_card_details, card_stolen
   - Determines if payment should be retried based on historical success rates
   - Returns reasoning and risk assessment

2. **Retry Strategy** (`src/services/retry-strategy.js`)
   - Generates retry schedules based on failure type
   - 3 strategies: immediate (0s, 60s, 300s), delayed (1h, 12h, 24h), limited (5min, 1h)
   - Respects merchant configuration overrides

3. **Rate Limiter** (`src/services/rate-limiter.js`)
   - Enforces processor-specific rate limits (Stripe: 5/24h, PSE: 3/12h, Nequi: 4/24h)
   - Prevents policy violations
   - Provides compliance checks

4. **ML Predictor** (`src/services/ml-predictor.js`) - BONUS
   - Adjusts base success probability using 5 factors:
     - Time of day (business hours = 1.2x boost)
     - Day of week (weekdays = 1.1x boost)
     - Transaction amount (small amounts = 1.3x boost)
     - Merchant category (simulated)
     - Historical success (simulated based on card)
   - Returns adjusted probability and confidence score

5. **Cost Calculator** (`src/utils/cost-calculator.js`)
   - Calculates ROI for retry attempts
   - Formula: ROI = (Expected Revenue - Total Cost) / Total Cost × 100%
   - Recommends retry only if ROI > 0%

---

## Configuration

### Failure Rules (`src/config/failure-rules.js`)

**Critical:** All retry behavior is driven by `FAILURE_RULES` configuration. When adding new failure types or modifying retry logic, update this file first.

```javascript
FAILURE_RULES = {
  insufficient_funds: {
    shouldRetry: true,
    retryStrategy: 'delayed',
    retryIntervals: [3600, 43200, 86400], // seconds
    maxRetries: 3,
    successProbability: 0.20,
    category: 'retryable_with_delay'
  },
  // ... more rules
}
```

**Rate Limits:** Defined in `RATE_LIMITS` object in same file. Update when processor policies change.

### Environment Variables (.env)

```env
PORT=4000                        # API port
NODE_ENV=development             # Environment
API_VERSION=v1                   # API version for routes
RETRY_FEE_COP=150               # Cost per retry in COP
RATE_LIMIT_WINDOW_MS=60000      # Rate limit window
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window
```

---

## API Endpoints

### POST `/api/v1/analyze-failure`
**Purpose:** Analyze a failed payment and get retry recommendation

**Required Fields:**
- `transactionId` (string)
- `merchantId` (string)
- `amount` (number, positive)
- `failureType` (enum: see FAILURE_RULES)
- `paymentProcessor` (enum: stripe, pse, nequi)

**Optional Fields:**
- `currency` (default: "COP")
- `attemptNumber` (default: 1)
- `timestamp` (default: current time)
- `cardLastFour` (for rate limiting)
- `merchantConfig.maxRetries` (override)
- `merchantConfig.enableAutoRetry` (boolean)

**Response Structure:**
```javascript
{
  shouldRetry: boolean,
  retryRecommendation: {
    nextRetryAt: ISO timestamp,
    retrySchedule: [...],
    mlEnhanced: true,
    predictionDetails: {...}
  },
  reasoning: {
    failureCategory: string,
    confidence: number,
    factors: [string],
    riskAssessment: string
  },
  estimatedSuccessProbability: number,
  costAnalysis: {
    roi: number,
    worthRetrying: boolean,
    ...
  },
  complianceChecks: {...}
}
```

### GET `/api/v1/health`
**Purpose:** Health check for monitoring/load balancers

**Response:**
```javascript
{
  status: "healthy",
  version: "1.0.0",
  timestamp: ISO string,
  uptime: number (seconds)
}
```

---

## Code Structure

```
src/
├── index.js                    # App entry point, Express setup, middleware
├── config/
│   └── failure-rules.js        # Business rules, rate limits, constants
├── controllers/
│   └── retry-controller.js     # Request handling, orchestration
├── routes/
│   └── retry-routes.js         # Route definitions
├── services/
│   ├── failure-analyzer.js     # Failure classification logic
│   ├── retry-strategy.js       # Retry scheduling algorithms
│   ├── rate-limiter.js         # Rate limit enforcement
│   └── ml-predictor.js         # ML success prediction (BONUS)
├── utils/
│   ├── cost-calculator.js      # ROI calculations
│   └── validators.js           # Joi schemas

tests/
├── test-cases.json             # Test data for manual/integration tests
├── unit-tests.test.js          # Unit tests for services
└── integration-tests.test.js   # API endpoint tests
```

---

## Important Concepts

### Failure Type Classification
The system categorizes failures into:
1. **Retryable with Delay** - insufficient_funds, card_declined, processor_downtime
2. **Retryable Immediately** - network_timeout
3. **Non-retryable (Customer Action)** - invalid_card_details
4. **Non-retryable (Security)** - card_stolen

**Adding a new failure type:**
1. Add to `FAILURE_RULES` in `src/config/failure-rules.js`
2. Update Joi validator in `src/utils/validators.js`
3. Add test cases in `tests/unit-tests.test.js` and `tests/test-cases.json`
4. Update README.md API documentation

### Rate Limit Tracking
Rate limits are tracked per card (using last 4 digits) per processor. **Important:** This is in-memory for MVP, so limits reset on server restart. V2 will use Redis for persistence.

### ML Prediction
The ML predictor is a **factor-based model**, not trained ML. It applies weighted adjustments to base success probability:
- Total adjustment capped at ±50%
- Probability always clamped between 0 and 1
- Confidence score based on factor variance from neutral (1.0)

**Improving predictions in V2:**
- Collect actual retry outcomes
- Train on historical data
- Implement online learning

### Cost-Benefit Analysis
Every retry recommendation includes ROI calculation. System recommends retry only if:
1. Failure type is retryable
2. Within rate limits
3. **ROI > 0%** (expected revenue exceeds cost)

Default retry fee: 150 COP (configurable via RETRY_FEE_COP env var)

---

## Testing Strategy

### Unit Tests
- Test each service in isolation
- Mock external dependencies
- Cover edge cases (e.g., unknown failure types, rate limit edge)
- Target: >85% coverage

### Integration Tests
- Test full request/response flow
- Use supertest for HTTP assertions
- Cover all API endpoints
- Validate error handling (400, 500 responses)

### Test Data
`tests/test-cases.json` contains 5 canonical test scenarios:
1. Insufficient funds (should retry)
2. Network timeout (immediate retry)
3. Card stolen (no retry)
4. Rate limit exceeded (blocked)
5. Low amount high success (ML boost)

**When adding features:** Add corresponding test cases to this file.

---

## Security & Compliance

### Input Validation
All requests validated with Joi schemas. **Never trust client input.**

### Rate Limiting
API rate limited to 100 req/min per IP (configurable). Prevents abuse.

### PCI-DSS Compliance
- Never log full card numbers (only last 4 digits)
- Audit trail for all retry decisions
- No sensitive data in error messages

### Security Headers
Helmet.js configured for:
- XSS protection
- CORS
- Content-Type enforcement

---

## Performance Targets

| Metric | Target | Current (MVP) |
|--------|--------|---------------|
| p95 latency | <100ms | ~50ms |
| Throughput | 1000 req/sec | Tested at 1000 |
| Uptime | 99.5% | TBD in prod |
| Test coverage | >85% | 85%+ |

---

## Common Development Tasks

### Adding a New Failure Type

1. **Update config:**
   ```javascript
   // src/config/failure-rules.js
   FAILURE_RULES.new_failure_type = {
     shouldRetry: true,
     retryStrategy: 'delayed',
     retryIntervals: [300, 1800],
     maxRetries: 2,
     successProbability: 0.15,
     category: 'retryable_with_delay'
   };
   ```

2. **Update validator:**
   ```javascript
   // src/utils/validators.js
   failureType: Joi.string().valid(
     // ... existing types,
     'new_failure_type'
   )
   ```

3. **Add tests:**
   ```javascript
   // tests/unit-tests.test.js
   test('should handle new_failure_type correctly', () => {
     const result = analyzeFailure({ failureType: 'new_failure_type' });
     expect(result.shouldRetry).toBe(true);
   });
   ```

4. **Update docs:**
   - Add to README.md API documentation
   - Add to PRD if business logic changes

---

### Modifying Retry Intervals

**Example:** Change insufficient_funds retry timing from [1h, 12h, 24h] to [30min, 6h, 12h]

```javascript
// src/config/failure-rules.js
insufficient_funds: {
  // ... other fields
  retryIntervals: [1800, 21600, 43200], // 30min, 6h, 12h in seconds
}
```

**Test changes:**
```bash
npm test -- --testNamePattern="insufficient funds"
```

---

### Adjusting ML Prediction Weights

**Example:** Increase impact of time-of-day factor

```javascript
// src/services/ml-predictor.js
const adjustment =
  (factors.timeOfDay - 1) * 0.15 + // Changed from 0.1 to 0.15
  // ... other factors
```

**Validate:** Check that adjusted probability still clamps to [0, 1] in tests.

---

## Deployment

### Railway (Recommended)
```bash
# Install CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

### Render (Alternative)
- Connect GitHub repo
- Build: `npm install`
- Start: `npm start`
- Add environment variables in dashboard

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure proper PORT (Railway auto-sets)
- [ ] Set RETRY_FEE_COP for production
- [ ] Enable monitoring (Datadog/CloudWatch)
- [ ] Set up alerts for error rate, latency
- [ ] Configure log aggregation

---

## Troubleshooting

### "Validation Error" on API requests
- Check request body matches schema in `src/utils/validators.js`
- Ensure failureType is one of 6 valid types
- Verify amount is positive number

### High latency (>100ms)
- Check ML predictor performance (should be <5ms)
- Profile with Node.js profiler
- Consider caching FAILURE_RULES (already in-memory)

### Rate limit violations in logs
- Review `RATE_LIMITS` in config
- Check if merchant hitting processor limits
- Verify attemptNumber is accurate

### Tests failing after changes
- Run `npm test -- --coverage` to see what's not covered
- Check if new code has corresponding tests
- Verify test-cases.json still valid

---

## Future Enhancements (V2+)

**Planned for V2 (Month 3):**
- PostgreSQL for retry history
- Redis for distributed rate limiting
- Real-time merchant dashboard
- Trained ML model (not factor-based)

**See docs/PRD.md Section 3.4 for full roadmap.**

---

## Resources

- **API Documentation:** README.md
- **Product Requirements:** docs/PRD.md
- **Postman Collection:** postman/novo-retry-api.postman_collection.json
- **Test Data:** tests/test-cases.json

---

## Questions?

For architectural questions, refer to PRD.md Section 2.2 (System Architecture).
For business logic questions, refer to PRD.md Section 1 (Problem & Strategy).
For implementation details, read the service files - they're well-commented.

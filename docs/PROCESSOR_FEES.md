# Processor-Specific Retry Fees

## Overview

The Novo Retry Intelligence API now supports **processor-specific retry fees** instead of a single global fee. This allows for more accurate cost-benefit analysis based on the actual costs charged by each payment processor.

## Configured Fees

Fees are configured in `src/config/failure-rules.js`:

```javascript
const RETRY_FEES = {
  stripe: 0,        // Stripe includes retries in base fee (no additional cost)
  pse: 1200,        // PSE charges per retry attempt (~1,200 COP estimated)
  nequi: 800,       // Nequi operational cost per retry (~800 COP estimated)
  default: 150,     // Default fallback for unknown processors
};
```

## Fee Details by Processor

### Stripe
- **Fee:** 0 COP
- **Rationale:** Stripe includes retry attempts in their base transaction fee (typically 3.5% + 900 COP). No additional cost per retry.
- **ROI Impact:** With zero retry cost, ROI is effectively infinite for any positive success probability.

### PSE (Pagos Seguros en Línea)
- **Fee:** 1,200 COP per retry
- **Rationale:** PSE (ACH Colombia) charges per transaction attempt. Estimated based on typical bank aggregator fees.
- **ROI Impact:** Higher cost means retry is only recommended for transactions with higher success probability or amount.

### Nequi
- **Fee:** 800 COP per retry
- **Rationale:** Nequi operational costs are lower than PSE but still incur per-attempt charges.
- **ROI Impact:** Moderate cost, suitable for most retry scenarios.

### Default/Unknown Processors
- **Fee:** 150 COP per retry
- **Rationale:** Conservative estimate for testing and unknown processors.

## Example Comparison

For a **50,000 COP transaction** with **20% success probability** and **3 retries**:

| Processor | Fee/Retry | Total Cost | Expected Revenue | ROI |
|-----------|-----------|------------|------------------|-----|
| Stripe    | 0 COP     | 0 COP      | 10,000 COP       | ∞   |
| PSE       | 1,200 COP | 3,600 COP  | 10,000 COP       | 178%|
| Nequi     | 800 COP   | 2,400 COP  | 10,000 COP       | 317%|

## Important Notes

⚠️ **These are placeholder values for MVP testing**

The current fee values are **estimates** and should be replaced with actual costs from:

1. **Contract agreements** with payment processors
2. **Operational costs** (API calls, infrastructure, support)
3. **Opportunity costs** (customer friction, time delays)
4. **Risk costs** (fraud prevention, chargebacks)

## How to Update Fees

### Option 1: Update Configuration File (Recommended)

Edit `src/config/failure-rules.js`:

```javascript
const RETRY_FEES = {
  stripe: 0,
  pse: 1500,    // Updated fee
  nequi: 900,   // Updated fee
  default: 200,
};
```

### Option 2: Add Environment Variables (Future Enhancement)

Could be implemented to override config values:

```env
STRIPE_RETRY_FEE=0
PSE_RETRY_FEE=1500
NEQUI_RETRY_FEE=900
```

## Impact on API Response

The `costAnalysis` object now includes the processor name:

```json
{
  "costAnalysis": {
    "retryFeePerAttempt": 1200,
    "totalRetryCost": 3600,
    "potentialRevenue": 50000,
    "expectedRevenue": 10000,
    "roi": 177.78,
    "worthRetrying": true,
    "processor": "pse"
  }
}
```

## Testing

Run tests to verify processor-specific fees:

```bash
npm test
```

The test suite includes:
- ✅ Stripe (0 COP fee, infinite ROI)
- ✅ PSE (1,200 COP fee)
- ✅ Nequi (800 COP fee)
- ✅ Default fallback (150 COP fee)

## Migration Notes

### Breaking Changes
- The `calculateROI()` function signature changed:
  - **Old:** `calculateROI(amount, maxRetries, probability, retryFee)`
  - **New:** `calculateROI(amount, maxRetries, probability, processor, retryFee)`

### Backward Compatibility
- The old signature still works by passing `null` as processor and fee as 5th argument
- Tests have been updated to use the new signature

---

**Last Updated:** 2025-11-05
**Version:** 1.1.0

# Deployment Guide

## Vercel Deployment (Serverless)

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- Git repository

### Step 1: Push to GitHub

```bash
cd "/Users/Oscar/Novo Project/novo-retry-intelligence-api"

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Novo Retry Intelligence API"

# Create repo on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/novo-retry-api.git
git push -u origin main
```

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# For production
vercel --prod
```

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect settings (vercel.json)
5. Click "Deploy"

### Step 3: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
NODE_ENV=production
API_VERSION=v1
RETRY_FEE_COP=150
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 4: Test Deployment

```bash
# Your API will be at: https://your-project.vercel.app

curl https://your-project.vercel.app/api/v1/health

curl -X POST https://your-project.vercel.app/api/v1/analyze-failure \
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

## Railway Deployment (Alternative - Persistent Server)

Railway might be better for this use case because:
- ✅ Persistent server (not serverless cold starts)
- ✅ Better for WebSocket/real-time features (future)
- ✅ Easier database integration
- ✅ More control over runtime

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Add domain
railway domain
```

---

## Performance Comparison

| Feature | Vercel (Serverless) | Railway (Persistent) |
|---------|--------------------|--------------------|
| Cold Start | 100-500ms | None (always warm) |
| Cost (Free Tier) | 100GB/month | 512MB RAM, $5 credit |
| Scalability | Auto (high) | Manual horizontal scaling |
| WebSockets | Limited | Full support |
| Database Integration | External only | Built-in Postgres |
| Best For | Stateless APIs | Stateful apps, DBs |

**Recommendation for this project: Railway** (for better database integration and no cold starts)

---

## Database Setup (Optional but Recommended)

### Current State (MVP)
- ✅ **Stateless API** - No database required
- ✅ Rate limits tracked in-memory (resets on restart)
- ✅ No retry history stored
- ✅ Perfect for testing and MVP

### Why Add a Database?

**Problems with current stateless approach:**
1. **Rate limits reset on restart** - Could allow more retries than allowed
2. **No retry history** - Can't analyze actual success rates
3. **Can't track merchant performance** - No analytics
4. **Can't improve ML model** - No training data

**Benefits of adding database:**
1. ✅ Persistent rate limit tracking
2. ✅ Historical retry analytics
3. ✅ ML model training data
4. ✅ Merchant-specific insights
5. ✅ Compliance audit trail

---

## Database Options

### Option 1: Vercel Postgres (with Vercel deployment)

**Pros:**
- Integrated with Vercel
- Serverless (pay-per-query)
- Easy setup

**Cons:**
- More expensive at scale
- Serverless DB (connection pooling needed)

**Setup:**
```bash
# Install Vercel Postgres
npm install @vercel/postgres

# In Vercel Dashboard: Storage → Create → Postgres
# Connection string auto-added to env vars
```

---

### Option 2: Supabase (Free tier: 500MB)

**Pros:**
- ✅ Free tier generous
- ✅ PostgreSQL with extensions
- ✅ Built-in auth (future feature)
- ✅ Real-time subscriptions
- ✅ Works with any host (Vercel, Railway, etc.)

**Cons:**
- External service
- Connection limits on free tier

**Setup:**
```bash
npm install @supabase/supabase-js

# 1. Create project at supabase.com
# 2. Get connection string from Settings → Database
# 3. Add to .env:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

---

### Option 3: Railway Postgres (with Railway deployment)

**Pros:**
- ✅ Built-in with Railway
- ✅ Persistent connection (not serverless)
- ✅ Easy integration
- ✅ No connection pooling needed

**Cons:**
- Tied to Railway hosting

**Setup:**
```bash
# In Railway Dashboard:
railway add postgresql

# Connection string auto-added to env vars
# Access via process.env.DATABASE_URL
```

---

### Option 4: Neon (Serverless Postgres)

**Pros:**
- ✅ Free tier: 512MB storage
- ✅ Serverless (auto-pause when idle)
- ✅ Great for development
- ✅ Works with any host

**Cons:**
- Cold starts for inactive DBs

**Setup:**
```bash
# 1. Create project at neon.tech
# 2. Get connection string
# 3. Add to .env
```

---

## Recommended Stack for V2

### For Production Scale:
```
Deployment: Railway
Database: Railway Postgres (or Supabase)
Caching: Redis (Railway addon)
Monitoring: Datadog / New Relic
```

### For Serverless/Low-Cost:
```
Deployment: Vercel
Database: Supabase
Caching: Vercel KV (Redis)
Monitoring: Vercel Analytics
```

---

## Adding Database to Current Project

If you want to add database support now, I can help you implement:

### Phase 1: Rate Limit Persistence (1-2 hours)
```sql
CREATE TABLE retry_rate_limits (
  card_last_four VARCHAR(4),
  processor VARCHAR(20),
  attempt_count INTEGER,
  window_start TIMESTAMP,
  PRIMARY KEY (card_last_four, processor)
);
```

### Phase 2: Retry History (2-3 hours)
```sql
CREATE TABLE retry_attempts (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100),
  merchant_id VARCHAR(100),
  amount INTEGER,
  failure_type VARCHAR(50),
  should_retry BOOLEAN,
  estimated_success_probability DECIMAL(5,4),
  retry_attempted BOOLEAN,
  retry_successful BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 3: Analytics & ML Training (3-4 hours)
```sql
CREATE TABLE retry_outcomes (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100),
  retry_attempt_number INTEGER,
  predicted_probability DECIMAL(5,4),
  actual_success BOOLEAN,
  factors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## What Would You Like to Do?

**Option A: Deploy MVP as-is (stateless)**
- Quick deployment to Vercel or Railway
- No database needed
- Perfect for testing and demo

**Option B: Add basic database (rate limits + history)**
- Choose database provider (Supabase recommended)
- Implement rate limit persistence
- Store retry history for analytics

**Option C: Full production setup**
- Database + caching
- Monitoring & alerting
- CI/CD pipeline
- Load balancing

Let me know which option you prefer!

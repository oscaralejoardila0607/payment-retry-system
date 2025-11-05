# 🚀 Novo Retry Intelligence API

AI-powered payment retry intelligence system that analyzes failed transactions and provides intelligent retry recommendations to maximize payment success rates and recover lost revenue.

## ✨ Features

- **🎯 Payment Simulator**: Realistic payment simulation with configurable outcomes
- **🤖 ML-Enhanced Analysis**: Intelligent retry recommendations based on failure type, time, and historical patterns
- **💰 Cost-Benefit Analysis**: ROI calculations for every retry recommendation
- **📊 Real-time Metrics**: Track success rates, retry performance, and revenue recovery
- **🔄 Multiple Retry Support**: Smart retry system with configurable limits
- **📈 Interactive Dashboard**: Beautiful React dashboard with dark mode support

## 🏗️ Architecture

```
novo-retry-intelligence-api/
├── src/                      # Backend API
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   ├── routes/              # API routes
│   ├── utils/               # Utilities
│   └── config/              # Configuration
├── client/                   # Frontend React app
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # State management
│   │   ├── utils/           # Frontend utilities
│   │   └── types/           # TypeScript types
└── tests/                    # Test suites
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/novo-retry-intelligence-api.git
cd novo-retry-intelligence-api
```

2. Install dependencies:
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Build the frontend:
```bash
cd client
npm run build
cd ..
```

5. Start the server:
```bash
npm start
```

6. Visit `http://localhost:4000` to see the dashboard!

## 🔧 Development

Run in development mode with auto-reload:

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend (optional, for hot reload)
cd client
npm run dev
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

## 📊 Database Setup (Supabase)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for setup to complete

### 2. Run the Schema

1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the query
4. Verify tables are created in Table Editor

### 3. Get API Credentials

1. Go to Project Settings → API
2. Copy your:
   - Project URL
   - Anon (public) key
   - Service role key (keep secret!)

### 4. Update Environment Variables

```env
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: `cd client && npm install && npm run build && cd .. && npm install`
   - **Output Directory**: `public`
   - **Install Command**: `npm install`

6. Add environment variables:
   ```
   NODE_ENV=production
   PORT=4000
   API_VERSION=v1
   RETRY_FEE_COP=150
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   ```

7. Click "Deploy"

## 🎮 API Endpoints

### POST `/api/v1/analyze-failure`

Analyze a failed payment and get retry recommendation.

**Request:**
```json
{
  "transactionId": "txn_001",
  "merchantId": "mch_123",
  "amount": 50000,
  "currency": "COP",
  "failureType": "insufficient_funds",
  "paymentProcessor": "stripe",
  "attemptNumber": 1
}
```

**Response:**
```json
{
  "shouldRetry": true,
  "estimatedSuccessProbability": 0.35,
  "retryRecommendation": {
    "nextRetryAt": "2025-04-12T03:00:00Z",
    "maxRetries": 3,
    "retrySchedule": [...]
  },
  "costAnalysis": {
    "roi": 722.22,
    "worthRetrying": true,
    "expectedRevenue": 29600
  }
}
```

### GET `/api/v1/health`

Health check endpoint.

## 📈 Key Metrics

The dashboard tracks:
- **Total Transactions**: All payment attempts
- **Success Rate**: Percentage of successful payments
- **Retry Success Rate**: Success rate of retried payments
- **Revenue Recovered**: Amount recovered through retries

## 🎯 Retry Intelligence Logic

### Failure Types & Strategies

| Failure Type | Success Probability | Strategy | Max Retries |
|--------------|-------------------|----------|-------------|
| Insufficient Funds | 20% | Delayed (1h, 12h, 24h) | 3 |
| Network Timeout | 70% | Immediate (0s, 60s, 300s) | 3 |
| Processor Downtime | 80% | Immediate | 3 |
| Card Declined | 15% | Delayed | 3 |
| Invalid Card Details | 5% | Limited | 1 |
| Card Stolen | 0% | None | 0 |

### ML Enhancement

The system improves base probabilities using:
- **Time of Day**: Business hours boost success by 20%
- **Day of Week**: Weekdays boost by 10%
- **Transaction Amount**: Small amounts boost by 30%
- **Historical Patterns**: Card-specific success rates
- **Merchant Category**: Industry-specific adjustments

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with:
- Node.js & Express
- React & TypeScript
- Tailwind CSS
- Supabase
- Vite

---

Made with ❤️ by the Novo Team

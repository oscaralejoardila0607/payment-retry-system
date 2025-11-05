-- Novo Retry Intelligence Database Schema
-- Created for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  merchant_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'COP',
  processor VARCHAR(50) NOT NULL,
  card_last_four VARCHAR(4),
  status VARCHAR(50) NOT NULL,
  failure_type VARCHAR(100),
  failure_reason TEXT,
  attempt_number INTEGER DEFAULT 1,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retry Analysis Table
CREATE TABLE IF NOT EXISTS retry_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id VARCHAR(255) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  should_retry BOOLEAN NOT NULL,
  estimated_success_probability DECIMAL(5, 4),
  max_retries INTEGER,
  next_retry_at TIMESTAMPTZ,
  retry_strategy VARCHAR(50),
  ml_enhanced BOOLEAN DEFAULT FALSE,
  cost_analysis JSONB,
  compliance_checks JSONB,
  recommended_action JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retry Attempts Table
CREATE TABLE IF NOT EXISTS retry_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id VARCHAR(255) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  success BOOLEAN,
  failure_type VARCHAR(100),
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant Configuration Table
CREATE TABLE IF NOT EXISTS merchant_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  merchant_id VARCHAR(255) UNIQUE NOT NULL,
  max_retries INTEGER DEFAULT 3,
  enable_auto_retry BOOLEAN DEFAULT TRUE,
  custom_retry_intervals JSONB,
  notification_webhook VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Metrics View
CREATE OR REPLACE VIEW payment_metrics AS
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN status IN ('success', 'retry_success') THEN 1 END) as successful_payments,
  COUNT(CASE WHEN status IN ('failed', 'retry_failed') THEN 1 END) as failed_payments,
  COUNT(CASE WHEN attempt_number > 1 THEN 1 END) as retried_payments,
  COUNT(CASE WHEN status = 'retry_success' THEN 1 END) as successful_retries,
  SUM(CASE WHEN status IN ('success', 'retry_success') THEN amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN status = 'retry_success' THEN amount ELSE 0 END) as recovered_revenue,
  ROUND(
    COUNT(CASE WHEN status IN ('success', 'retry_success') THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate,
  ROUND(
    COUNT(CASE WHEN status = 'retry_success' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN attempt_number > 1 THEN 1 END), 0) * 100,
    2
  ) as retry_success_rate
FROM transactions;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_retry_analyses_transaction ON retry_analyses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_retry_attempts_transaction ON retry_attempts(transaction_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_configs_updated_at BEFORE UPDATE ON merchant_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE retry_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE retry_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_configs ENABLE ROW LEVEL SECURITY;

-- Public read access (for demo purposes - adjust for production)
CREATE POLICY "Enable read access for all users" ON transactions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON transactions FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON retry_analyses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON retry_analyses FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON retry_attempts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON retry_attempts FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON merchant_configs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON merchant_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON merchant_configs FOR UPDATE USING (true);

-- Sample merchant configuration
INSERT INTO merchant_configs (merchant_id, max_retries, enable_auto_retry)
VALUES ('mch_novo_demo', 3, true)
ON CONFLICT (merchant_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE transactions IS 'Stores all payment transactions and their status';
COMMENT ON TABLE retry_analyses IS 'Stores AI-powered retry analysis results';
COMMENT ON TABLE retry_attempts IS 'Tracks individual retry attempts for each transaction';
COMMENT ON TABLE merchant_configs IS 'Merchant-specific retry configuration';
COMMENT ON VIEW payment_metrics IS 'Aggregated payment and retry metrics';

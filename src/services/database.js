const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ccejxvhnuyppxjboenww.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZWp4dmhudXlwcHhqYm9lbnd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI5MjYzNCwiZXhwIjoyMDc3ODY4NjM0fQ.HJqWCGcQQqhr6VoUWOvYS-KzpDjHAMDGdyUaKEmdc3w';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Save a payment transaction to the database
 */
async function saveTransaction(transaction) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        transaction_id: transaction.transactionId,
        merchant_id: transaction.merchantId,
        customer_name: transaction.customerName,
        amount: transaction.amount,
        currency: transaction.currency,
        processor: transaction.processor,
        card_last_four: transaction.cardLastFour,
        status: transaction.status,
        failure_type: transaction.failureType,
        failure_reason: transaction.failureReason,
        attempt_number: transaction.attemptNumber,
        timestamp: transaction.timestamp || new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving transaction:', error);
    return null;
  }
}

/**
 * Update a transaction
 */
async function updateTransaction(transactionId, updates) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('transaction_id', transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating transaction:', error);
    return null;
  }
}

/**
 * Save retry analysis
 */
async function saveRetryAnalysis(analysis) {
  try {
    const { data, error } = await supabase
      .from('retry_analyses')
      .insert([{
        transaction_id: analysis.transactionId,
        should_retry: analysis.shouldRetry,
        estimated_success_probability: analysis.estimatedSuccessProbability,
        max_retries: analysis.retryRecommendation?.maxRetries,
        next_retry_at: analysis.retryRecommendation?.nextRetryAt,
        retry_strategy: analysis.retryRecommendation?.retryStrategy,
        ml_enhanced: analysis.retryRecommendation?.mlEnhanced,
        cost_analysis: analysis.costAnalysis,
        compliance_checks: analysis.complianceChecks,
        recommended_action: analysis.recommendedAction,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving retry analysis:', error);
    return null;
  }
}

/**
 * Get all transactions
 */
async function getTransactions(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

/**
 * Get payment metrics from the view
 */
async function getPaymentMetrics() {
  try {
    const { data, error} = await supabase
      .from('payment_metrics')
      .select('*')
      .single();

    if (error) throw error;
    return data || {
      total_transactions: 0,
      successful_payments: 0,
      failed_payments: 0,
      retried_payments: 0,
      successful_retries: 0,
      total_revenue: 0,
      recovered_revenue: 0,
      success_rate: 0,
      retry_success_rate: 0,
    };
  } catch (error) {
    console.error('Error getting metrics:', error);
    return {
      total_transactions: 0,
      successful_payments: 0,
      failed_payments: 0,
      retried_payments: 0,
      successful_retries: 0,
      total_revenue: 0,
      recovered_revenue: 0,
      success_rate: 0,
      retry_success_rate: 0,
    };
  }
}

/**
 * Delete all transactions (clear history)
 */
async function clearTransactions() {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing transactions:', error);
    return false;
  }
}

module.exports = {
  supabase,
  saveTransaction,
  updateTransaction,
  saveRetryAnalysis,
  getTransactions,
  getPaymentMetrics,
  clearTransactions,
};

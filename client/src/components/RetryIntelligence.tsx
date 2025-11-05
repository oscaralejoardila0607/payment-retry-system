import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, Sparkles, Clock, DollarSign, Shield, AlertCircle, TrendingUp, Timer, Copy, RefreshCw } from 'lucide-react';
import { analyzeFailure, checkHealth } from '../utils/api';
import { exampleTransactions } from '../utils/examples';
import { getRelativeTime, formatTimeRemaining, getProcessorFeeLabel, formatInterval } from '../utils/timeUtils';
import { usePaymentContext } from '../context/PaymentContext';
import { simulatePayment } from '../utils/paymentSimulator';
import type { TransactionRequest, AnalysisResponse, FailureType, PaymentProcessor } from '../types/api.types';

export default function RetryIntelligence() {
  const { currentPayment, updatePayment } = usePaymentContext();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState<TransactionRequest>({
    transactionId: '',
    merchantId: '',
    amount: 50000,
    currency: 'COP',
    failureType: 'insufficient_funds',
    paymentProcessor: 'stripe',
    attemptNumber: 1,
  });

  // Auto-fill form if coming from payment simulator
  useEffect(() => {
    if (currentPayment && currentPayment.status === 'analyzing' && currentPayment.analysisResult) {
      setResponse(currentPayment.analysisResult);
      setFormData({
        transactionId: currentPayment.transactionId,
        merchantId: currentPayment.merchantId,
        amount: currentPayment.amount,
        currency: currentPayment.currency,
        failureType: currentPayment.failureType!,
        failureReason: currentPayment.failureReason,
        paymentProcessor: currentPayment.processor,
        cardLastFour: currentPayment.cardLastFour,
        attemptNumber: currentPayment.attemptNumber,
      });
    }
  }, [currentPayment]);

  useEffect(() => {
    checkHealth().then(() => setApiStatus('online')).catch(() => setApiStatus('offline'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeFailure({
        ...formData,
        timestamp: new Date().toISOString()
      });
      setResponse(result);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to analyze transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (exampleKey: string) => {
    const example = exampleTransactions[exampleKey];
    if (example) {
      setFormData({ ...formData, ...example, timestamp: new Date().toISOString() } as TransactionRequest);
      setResponse(null);
      setError(null);
    }
  };

  const copyToClipboard = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      alert('Response copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRetryPayment = async () => {
    if (!currentPayment || !response) return;

    setIsRetrying(true);

    // Simulate a small delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    const currentAttempt = currentPayment.attemptNumber + 1;

    // Simulate retry based on improved probability
    const retryAttempt = simulatePayment({
      processor: currentPayment.processor,
      amount: currentPayment.amount,
      attemptNumber: currentAttempt,
      lastFailureType: currentPayment.failureType,
      timeSinceLastAttempt: 0, // Immediate retry
    });

    if (retryAttempt.success) {
      // Retry succeeded
      await updatePayment(currentPayment.id, {
        status: 'retry_success',
        attemptNumber: currentAttempt,
      });
      setRetryResult({
        success: true,
        message: `Payment successfully processed on attempt ${currentAttempt}!`,
      });
    } else {
      // Retry failed - update payment but allow more retries if within limit
      await updatePayment(currentPayment.id, {
        status: 'retry_failed',
        attemptNumber: currentAttempt,
        failureType: retryAttempt.failureType,
        failureReason: retryAttempt.failureReason,
      });
      setRetryResult({
        success: false,
        message: `Attempt ${currentAttempt} failed: ${retryAttempt.failureReason}`,
      });

      // Clear retry result after 3 seconds to allow next retry
      setTimeout(() => {
        setRetryResult(null);
      }, 3000);
    }

    setIsRetrying(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with status indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Retry Intelligence Analysis</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentPayment ? 'Analyzing transaction from Payment Simulator' : 'Analyze failed transactions independently'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-green-500' : apiStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            API {apiStatus}
          </span>
        </div>
      </div>

      {/* Quick Examples */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Examples</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.keys(exampleTransactions).map((key) => (
            <button
              key={key}
              onClick={() => loadExample(key)}
              className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction Details</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction ID *</label>
                  <input value={formData.transactionId} onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Merchant ID *</label>
                  <input value={formData.merchantId} onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (COP) *</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attempt #</label>
                  <input type="number" value={formData.attemptNumber} onChange={(e) => setFormData({ ...formData, attemptNumber: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" min="1" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Failure Type *</label>
                <select value={formData.failureType} onChange={(e) => setFormData({ ...formData, failureType: e.target.value as FailureType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required>
                  <option value="insufficient_funds">Insufficient Funds</option>
                  <option value="card_declined">Card Declined</option>
                  <option value="network_timeout">Network Timeout</option>
                  <option value="processor_downtime">Processor Downtime</option>
                  <option value="invalid_card_details">Invalid Card Details</option>
                  <option value="card_stolen">Card Stolen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Processor *</label>
                <select value={formData.paymentProcessor} onChange={(e) => setFormData({ ...formData, paymentProcessor: e.target.value as PaymentProcessor })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required>
                  <option value="stripe">Stripe</option>
                  <option value="pse">PSE</option>
                  <option value="nequi">Nequi</option>
                </select>
              </div>
              <button type="submit" disabled={isLoading || apiStatus !== 'online'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                {isLoading ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</>) : (<><Sparkles className="w-5 h-5" />Analyze Payment Failure</>)}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Results */}
        <div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {response ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 space-y-6">
              {/* Copy JSON Button */}
              <div className="flex justify-end">
                <button onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </button>
              </div>

              {/* Main Decision Banner */}
              <div className={`rounded-xl p-6 ${response.shouldRetry ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {response.shouldRetry ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                    <div>
                      <h3 className="text-xl font-bold">{response.shouldRetry ? 'SHOULD RETRY' : 'DO NOT RETRY'}</h3>
                      <p className="text-sm opacity-90">Transaction: {response.transactionId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{(response.estimatedSuccessProbability * 100).toFixed(1)}%</div>
                    <div className="text-sm opacity-90">Success Rate</div>
                  </div>
                </div>
                <div className="w-full bg-white/30 dark:bg-black/20 rounded-full h-2">
                  <div className="bg-current h-2 rounded-full transition-all" style={{ width: `${response.estimatedSuccessProbability * 100}%` }} />
                </div>
              </div>

              {/* Executive Summary - 3 Key Questions */}
              {response.shouldRetry && response.retryRecommendation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Retry Recommendation Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Should Retry?</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">YES ✓</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">When?</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {response.retryRecommendation.nextRetryAt ? getRelativeTime(response.retryRecommendation.nextRetryAt) : 'Now'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ({formatInterval(response.retryRecommendation.retryIntervalSeconds)} wait)
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">How many times?</div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {response.retryRecommendation.maxRetries} attempts
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {response.retryRecommendation.remainingRetries} remaining
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Retry Schedule with Timeline */}
              {response.shouldRetry && response.retryRecommendation && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Retry Schedule</h4>
                  </div>
                  <div className="space-y-3">
                    {response.retryRecommendation.retrySchedule.slice(0, 3).map((attempt, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shrink-0">{attempt.attemptNumber}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-blue-900 dark:text-blue-100">
                              {attempt.scheduledAt && getRelativeTime(attempt.scheduledAt)}
                            </span>
                            <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {new Date(attempt.scheduledAt).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{attempt.reason}</div>
                          {response.retryRecommendation && idx < response.retryRecommendation.retrySchedule.length - 1 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                              Wait {formatInterval(attempt.intervalSeconds)} before next attempt
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost Analysis with Processor Info */}
              {response.costAnalysis && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Cost Analysis</h4>
                    </div>
                    <div className="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                      {getProcessorFeeLabel(response.costAnalysis.processor || 'default', response.costAnalysis.retryFeePerAttempt)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Retry Cost</div>
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        ${(response.costAnalysis.totalRetryCost || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        ${response.costAnalysis.retryFeePerAttempt || 0} × {response.retryRecommendation?.maxRetries || 0}
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Expected Revenue</div>
                      <div className="text-lg font-bold text-green-900 dark:text-green-100">
                        ${(response.costAnalysis.expectedRevenue || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {((response.estimatedSuccessProbability || 0) * 100).toFixed(1)}% success
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">ROI</div>
                      <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                        {response.costAnalysis.roi === Infinity ? '∞' : `+${(response.costAnalysis.roi || 0).toLocaleString()}%`}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {response.costAnalysis.worthRetrying ? 'Profitable ✓' : 'Not profitable'}
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Potential Revenue</div>
                      <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        ${(response.costAnalysis.potentialRevenue || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        If successful
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Compliance with Enhanced Rate Limit */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Compliance & Rate Limits</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Rate Limit Status */}
                  <div className={`p-4 rounded-lg border-2 ${response.complianceChecks.withinRateLimit ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {response.complianceChecks.withinRateLimit ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                        <span className="font-medium text-gray-900 dark:text-white">Rate Limit</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${response.complianceChecks.withinRateLimit ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'}`}>
                        {response.complianceChecks.withinRateLimit ? 'OK' : 'EXCEEDED'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {response.complianceChecks.rateLimitRemaining || 0} of {(response.complianceChecks.rateLimitRemaining || 0) + (response.retryRecommendation?.maxRetries || 0)} retries
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div className={`h-2 rounded-full transition-all ${response.complianceChecks.withinRateLimit ? 'bg-green-600' : 'bg-red-600'}`}
                        style={{ width: `${((response.complianceChecks.rateLimitRemaining || 0) / ((response.complianceChecks.rateLimitRemaining || 0) + (response.retryRecommendation?.maxRetries || 1))) * 100}%` }} />
                    </div>
                    {response.complianceChecks.rateLimitResetAt && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Resets in {formatTimeRemaining(response.complianceChecks.rateLimitResetAt)}
                      </div>
                    )}
                  </div>

                  {/* PCI Compliance */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900 dark:text-white">PCI Compliant</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-bold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                        ✓ VERIFIED
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      No sensitive card data stored or logged
                    </div>
                  </div>
                </div>
              </div>

              {response.recommendedAction && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">{response.recommendedAction.action.replace(/_/g, ' ').toUpperCase()}</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">{response.recommendedAction.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Retry Payment Button - Only show if from simulator */}
              {currentPayment && response.shouldRetry && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {(() => {
                    const maxRetries = response.retryRecommendation?.maxRetries || 3;
                    const currentAttempts = currentPayment.attemptNumber;
                    const retriesRemaining = Math.max(0, maxRetries - (currentAttempts - 1));
                    const canRetry = retriesRemaining > 0 && !retryResult?.success;

                    return (
                      <>
                        <button
                          onClick={handleRetryPayment}
                          disabled={isRetrying || !canRetry}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-3 shadow-lg"
                        >
                          {isRetrying ? (
                            <>
                              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                              Retrying Payment...
                            </>
                          ) : canRetry ? (
                            <>
                              <RefreshCw className="w-6 h-6" />
                              Retry Payment Now ({retriesRemaining} {retriesRemaining === 1 ? 'attempt' : 'attempts'} remaining)
                            </>
                          ) : (
                            <>
                              <XCircle className="w-6 h-6" />
                              {retryResult?.success ? 'Payment Successful' : 'Maximum Retries Reached'}
                            </>
                          )}
                        </button>
                        {canRetry && !isRetrying && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                            Based on analysis, this payment has a {((response.estimatedSuccessProbability || 0) * 100).toFixed(1)}% chance of success
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Retry Result - Compact notification */}
              {retryResult && (
                <div className={`p-4 rounded-lg border-2 ${retryResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                  <div className="flex items-center gap-3">
                    {retryResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-bold ${retryResult.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                        {retryResult.success ? 'Payment Successful!' : 'Retry Failed'}
                      </h4>
                      <p className={`text-sm ${retryResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {retryResult.message}
                      </p>
                    </div>
                    {retryResult.success && currentPayment && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                          ${currentPayment.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">COP</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
              <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ready to Analyze</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {currentPayment ? 'Transaction data loaded from simulator' : 'Fill out the form or select a quick example to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

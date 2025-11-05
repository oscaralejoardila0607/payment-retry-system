import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, Moon, Sun, Sparkles, Clock, DollarSign, Shield, AlertCircle } from 'lucide-react';
import { analyzeFailure, checkHealth } from './utils/api';
import { exampleTransactions } from './utils/examples';
import type { TransactionRequest, AnalysisResponse, FailureType, PaymentProcessor } from './types/api.types';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const [formData, setFormData] = useState<TransactionRequest>({
    transactionId: '',
    merchantId: '',
    amount: 50000,
    currency: 'COP',
    failureType: 'insufficient_funds',
    paymentProcessor: 'stripe',
    attemptNumber: 1,
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 dark:bg-blue-500 rounded-lg p-2">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Retry Intelligence</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Retry Analysis Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">API {apiStatus}</span>
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Examples</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.keys(exampleTransactions).map((key) => (
              <button key={key} onClick={() => loadExample(key)}
                className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-sm font-medium text-gray-700 dark:text-gray-300">
                {key.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Transaction Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction ID *</label>
                    <input type="text" value={formData.transactionId} onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Merchant ID *</label>
                    <input type="text" value={formData.merchantId} onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (COP) *</label>
                    <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attempt #</label>
                    <input type="number" value={formData.attemptNumber} onChange={(e) => setFormData({ ...formData, attemptNumber: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" min="1" max="10" />
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

                {response.shouldRetry && response.retryRecommendation && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Retry Schedule</h4>
                    </div>
                    <div className="space-y-3">
                      {response.retryRecommendation.retrySchedule.slice(0, 3).map((attempt, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">{attempt.attemptNumber}</div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{new Date(attempt.scheduledAt).toLocaleString()}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{attempt.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {response.costAnalysis && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Cost Analysis</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Expected Revenue</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">${response.costAnalysis.expectedRevenue.toLocaleString()}</div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">ROI</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">+{response.costAnalysis.roi.toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Compliance</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      {response.complianceChecks.withinRateLimit ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                      <span className="text-sm text-gray-700 dark:text-gray-300">Within Rate Limit</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">PCI Compliant</span>
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
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ready to Analyze</h3>
                <p className="text-gray-600 dark:text-gray-400">Fill out the form or select a quick example to get started</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle2, XCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import { usePaymentContext } from '../context/PaymentContext';
import { simulatePayment, simulatePaymentForced, generateTransactionId } from '../utils/paymentSimulator';
import { analyzeFailure } from '../utils/api';
import type { PaymentFormData, SimulatedPayment } from '../types/simulator.types';
import type { PaymentProcessor, FailureType } from '../types/api.types';

interface PaymentSimulatorProps {
  onAnalyze?: () => void;
}

export default function PaymentSimulator({ onAnalyze }: PaymentSimulatorProps) {
  const { addPayment, setCurrentPayment, updatePayment } = usePaymentContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SimulatedPayment | null>(null);

  const [formData, setFormData] = useState<PaymentFormData>({
    customerName: 'John Doe',
    amount: 50000,
    processor: 'stripe',
    cardLastFour: '4242',
    simulateOutcome: 'random',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setResult(null);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const transactionId = generateTransactionId();
    const merchantId = `mch_novo_${Math.random().toString(36).substr(2, 6)}`;

    // Simulate payment
    let simulationResult;
    if (formData.simulateOutcome === 'success') {
      simulationResult = simulatePaymentForced('success');
    } else if (formData.simulateOutcome === 'force_failure') {
      simulationResult = simulatePaymentForced('failure', formData.forcedFailureType);
    } else {
      simulationResult = simulatePayment({
        processor: formData.processor,
        amount: formData.amount,
        attemptNumber: 1,
      });
    }

    const payment: SimulatedPayment = {
      id: `pay_${Date.now()}`,
      transactionId,
      merchantId,
      customerName: formData.customerName,
      amount: formData.amount,
      currency: 'COP',
      processor: formData.processor,
      cardLastFour: formData.cardLastFour,
      status: simulationResult.success ? 'success' : 'failed',
      failureType: simulationResult.failureType,
      failureReason: simulationResult.failureReason,
      timestamp: new Date().toISOString(),
      attemptNumber: 1,
    };

    setResult(payment);
    addPayment(payment);
    setIsProcessing(false);
  };

  const handleAnalyze = async () => {
    if (!result || result.status !== 'failed') return;

    try {
      updatePayment(result.id, { status: 'analyzing' });

      const analysis = await analyzeFailure({
        transactionId: result.transactionId,
        merchantId: result.merchantId,
        amount: result.amount,
        currency: result.currency,
        failureType: result.failureType!,
        failureReason: result.failureReason,
        paymentProcessor: result.processor,
        cardLastFour: result.cardLastFour,
        attemptNumber: result.attemptNumber,
        timestamp: result.timestamp,
      });

      const updatedPayment = {
        ...result,
        analysisResult: analysis,
        status: 'analyzing' as const,
      };

      updatePayment(result.id, { analysisResult: analysis, status: 'analyzing' });
      setCurrentPayment(updatedPayment);

      if (onAnalyze) {
        onAnalyze();
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const handleRetry = async () => {
    if (!result || !result.analysisResult?.shouldRetry) return;

    setIsProcessing(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Calculate time since last attempt (for realistic simulation, use 0 for immediate retry)
    const timeSinceLastAttempt = 0; // Immediate retry

    const retryResult = simulatePayment({
      processor: result.processor,
      amount: result.amount,
      attemptNumber: result.attemptNumber + 1,
      lastFailureType: result.failureType,
      timeSinceLastAttempt,
    });

    const updatedPayment: SimulatedPayment = {
      ...result,
      attemptNumber: result.attemptNumber + 1,
      status: retryResult.success ? 'retry_success' : 'retry_failed',
      retryAttempts: [
        ...(result.retryAttempts || []),
        {
          attemptNumber: result.attemptNumber + 1,
          timestamp: new Date().toISOString(),
          status: retryResult.success ? 'success' : 'failed',
          reason: retryResult.failureReason,
        },
      ],
    };

    if (!retryResult.success) {
      updatedPayment.failureType = retryResult.failureType;
      updatedPayment.failureReason = retryResult.failureReason;
    }

    setResult(updatedPayment);
    updatePayment(result.id, updatedPayment);
    setIsProcessing(false);
  };

  const handleNewPayment = () => {
    setResult(null);
    setFormData({
      customerName: 'John Doe',
      amount: 50000,
      processor: 'stripe',
      cardLastFour: '4242',
      simulateOutcome: 'random',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Simulator</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Simulate payment processing with realistic outcomes</p>
          </div>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (COP)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                  min="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Processor</label>
                <select
                  value={formData.processor}
                  onChange={(e) => setFormData({ ...formData, processor: e.target.value as PaymentProcessor })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="stripe">Stripe</option>
                  <option value="pse">PSE</option>
                  <option value="nequi">Nequi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Card Last 4 Digits</label>
                <input
                  type="text"
                  value={formData.cardLastFour}
                  onChange={(e) => setFormData({ ...formData, cardLastFour: e.target.value.slice(0, 4) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Simulate Outcome</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="outcome"
                    value="random"
                    checked={formData.simulateOutcome === 'random'}
                    onChange={() => setFormData({ ...formData, simulateOutcome: 'random' })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Random (Realistic)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="outcome"
                    value="success"
                    checked={formData.simulateOutcome === 'success'}
                    onChange={() => setFormData({ ...formData, simulateOutcome: 'success' })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Force Success</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="outcome"
                    value="force_failure"
                    checked={formData.simulateOutcome === 'force_failure'}
                    onChange={() => setFormData({ ...formData, simulateOutcome: 'force_failure' })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Force Failure</span>
                </label>
              </div>

              {formData.simulateOutcome === 'force_failure' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Failure Type</label>
                  <select
                    value={formData.forcedFailureType || 'insufficient_funds'}
                    onChange={(e) => setFormData({ ...formData, forcedFailureType: e.target.value as FailureType })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="insufficient_funds">Insufficient Funds</option>
                    <option value="card_declined">Card Declined</option>
                    <option value="network_timeout">Network Timeout</option>
                    <option value="processor_downtime">Processor Downtime</option>
                    <option value="invalid_card_details">Invalid Card Details</option>
                    <option value="card_stolen">Card Stolen</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Process Payment
                </>
              )}
            </button>
          </form>
        ) : (
          <PaymentResult
            payment={result}
            isProcessing={isProcessing}
            onAnalyze={handleAnalyze}
            onRetry={handleRetry}
            onNewPayment={handleNewPayment}
          />
        )}
      </div>
    </div>
  );
}

interface PaymentResultProps {
  payment: SimulatedPayment;
  isProcessing: boolean;
  onAnalyze: () => void;
  onRetry: () => void;
  onNewPayment: () => void;
}

function PaymentResult({ payment, isProcessing, onAnalyze, onRetry, onNewPayment }: PaymentResultProps) {
  const isSuccess = payment.status === 'success' || payment.status === 'retry_success';
  const isFailed = payment.status === 'failed' || payment.status === 'retry_failed';

  return (
    <div className="space-y-4">
      <div className={`p-6 rounded-xl border-2 ${
        isSuccess ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
        'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {isSuccess ? (
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          ) : (
            <XCircle className="w-10 h-10 text-red-600" />
          )}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isSuccess ? 'PAYMENT SUCCESSFUL' : 'PAYMENT FAILED'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Transaction: {payment.transactionId}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Customer</div>
            <div className="font-medium text-gray-900 dark:text-white">{payment.customerName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Amount</div>
            <div className="font-medium text-gray-900 dark:text-white">${payment.amount.toLocaleString()} COP</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Processor</div>
            <div className="font-medium text-gray-900 dark:text-white">{payment.processor.toUpperCase()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Card</div>
            <div className="font-medium text-gray-900 dark:text-white">**** {payment.cardLastFour}</div>
          </div>
        </div>

        {isFailed && payment.failureReason && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <div className="font-medium text-red-900 dark:text-red-100">Failure Reason</div>
                <div className="text-sm text-red-700 dark:text-red-300">{payment.failureReason}</div>
              </div>
            </div>
          </div>
        )}

        {payment.retryAttempts && payment.retryAttempts.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Retry History</div>
            <div className="space-y-2">
              {payment.retryAttempts.map((attempt, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {attempt.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-gray-700 dark:text-gray-300">
                    Attempt #{attempt.attemptNumber} - {attempt.status === 'success' ? 'Success' : attempt.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {isFailed && !payment.analysisResult && (
          <button
            onClick={onAnalyze}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Analyze with Retry Intelligence
          </button>
        )}

        {payment.analysisResult?.shouldRetry && payment.status !== 'retry_success' && (
          <button
            onClick={onRetry}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Retry Payment Now
              </>
            )}
          </button>
        )}

        <button
          onClick={onNewPayment}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Clock className="w-5 h-5" />
          New Payment
        </button>
      </div>
    </div>
  );
}

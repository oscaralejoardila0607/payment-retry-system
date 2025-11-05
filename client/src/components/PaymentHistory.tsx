import { useState } from 'react';
import { History, TrendingUp, DollarSign, CheckCircle2, XCircle, RefreshCw, Trash2, Filter } from 'lucide-react';
import { usePaymentContext } from '../context/PaymentContext';
import type { PaymentStatus } from '../types/simulator.types';

export default function PaymentHistory() {
  const { payments, getMetrics, clearHistory } = usePaymentContext();
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');

  const metrics = getMetrics();

  const filteredPayments = filterStatus === 'all'
    ? payments
    : payments.filter(p => p.status === filterStatus);

  const getStatusBadge = (status: PaymentStatus) => {
    const badges = {
      success: { label: 'Success', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle2 },
      failed: { label: 'Failed', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
      retry_success: { label: 'Retry Success', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: RefreshCw },
      retry_failed: { label: 'Retry Failed', className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: XCircle },
      processing: { label: 'Processing', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: RefreshCw },
      analyzing: { label: 'Analyzing', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', icon: TrendingUp },
      retrying: { label: 'Retrying', className: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', icon: RefreshCw },
      pending: { label: 'Pending', className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300', icon: RefreshCw },
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={History}
          label="Total Transactions"
          value={metrics.totalTransactions}
          color="blue"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          subtitle={`${metrics.successfulPayments} successful`}
          color="green"
        />
        <MetricCard
          icon={RefreshCw}
          label="Retry Success Rate"
          value={`${metrics.retrySuccessRate.toFixed(1)}%`}
          subtitle={`${metrics.successfulRetries} of ${metrics.retriedPayments}`}
          color="purple"
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue Recovered"
          value={`$${metrics.recoveredRevenue.toLocaleString()}`}
          subtitle={`of $${metrics.totalRevenue.toLocaleString()} total`}
          color="green"
        />
      </div>

      {/* Revenue Breakdown */}
      {metrics.totalRevenue > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="font-medium text-gray-900 dark:text-white">${metrics.totalRevenue.toLocaleString()} COP</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {metrics.recoveredRevenue > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Recovered from Retries</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">${metrics.recoveredRevenue.toLocaleString()} COP</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(metrics.recoveredRevenue / metrics.totalRevenue) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {((metrics.recoveredRevenue / metrics.totalRevenue) * 100).toFixed(1)}% of total revenue recovered through retries
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment History</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{filteredPayments.length} transactions</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | 'all')}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="retry_success">Retry Success</option>
                  <option value="retry_failed">Retry Failed</option>
                </select>
              </div>

              {/* Clear History */}
              {payments.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to clear all payment history?')) {
                      await clearHistory();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Payments Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">Start by simulating a payment in the Payment Simulator tab</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Processor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{payment.transactionId}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">**** {payment.cardLastFour}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {payment.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${payment.amount.toLocaleString()} {payment.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {payment.processor.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {payment.attemptNumber > 1 ? `${payment.attemptNumber} attempts` : '1 attempt'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(payment.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ icon: Icon, label, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className={`p-6 rounded-xl border-2 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-6 h-6" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

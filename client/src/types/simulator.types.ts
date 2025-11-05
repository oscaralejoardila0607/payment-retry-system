/**
 * Types for Payment Simulator
 */

import type { AnalysisResponse, PaymentProcessor, FailureType } from './api.types';

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'analyzing' | 'retrying' | 'retry_success' | 'retry_failed';

export interface SimulatedPayment {
  id: string;
  transactionId: string;
  merchantId: string;
  customerName: string;
  amount: number;
  currency: string;
  processor: PaymentProcessor;
  cardLastFour: string;
  status: PaymentStatus;
  failureType?: FailureType;
  failureReason?: string;
  timestamp: string;
  attemptNumber: number;
  analysisResult?: AnalysisResponse;
  retryAttempts?: RetryAttempt[];
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: string;
  status: 'success' | 'failed';
  reason?: string;
}

export interface PaymentFormData {
  customerName: string;
  amount: number;
  processor: PaymentProcessor;
  cardLastFour: string;
  simulateOutcome: 'random' | 'success' | 'force_failure';
  forcedFailureType?: FailureType;
}

export interface PaymentMetrics {
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  retriedPayments: number;
  successfulRetries: number;
  totalRevenue: number;
  recoveredRevenue: number;
  successRate: number;
  retrySuccessRate: number;
}

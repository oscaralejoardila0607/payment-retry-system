import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { SimulatedPayment, PaymentMetrics } from '../types/simulator.types';
import { supabase } from '../utils/supabase';

interface PaymentContextType {
  payments: SimulatedPayment[];
  currentPayment: SimulatedPayment | null;
  addPayment: (payment: SimulatedPayment) => Promise<void>;
  updatePayment: (id: string, updates: Partial<SimulatedPayment>) => Promise<void>;
  setCurrentPayment: (payment: SimulatedPayment | null) => void;
  getMetrics: () => PaymentMetrics;
  clearHistory: () => Promise<void>;
  isLoading: boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<SimulatedPayment[]>([]);
  const [currentPayment, setCurrentPayment] = useState<SimulatedPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load payments from Supabase on mount
  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform database format to app format
      const transformed = (data || []).map((tx: any) => ({
        id: tx.id,
        transactionId: tx.transaction_id,
        merchantId: tx.merchant_id,
        customerName: tx.customer_name,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        processor: tx.processor,
        cardLastFour: tx.card_last_four,
        status: tx.status,
        failureType: tx.failure_type,
        failureReason: tx.failure_reason,
        timestamp: tx.timestamp,
        attemptNumber: tx.attempt_number,
      }));

      setPayments(transformed);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addPayment = async (payment: SimulatedPayment) => {
    try {
      // Add to local state immediately for responsive UI
      setPayments(prev => [payment, ...prev]);

      // Save to Supabase
      const { error } = await supabase
        .from('transactions')
        .insert([{
          id: payment.id,
          transaction_id: payment.transactionId,
          merchant_id: payment.merchantId,
          customer_name: payment.customerName,
          amount: payment.amount,
          currency: payment.currency,
          processor: payment.processor,
          card_last_four: payment.cardLastFour,
          status: payment.status,
          failure_type: payment.failureType,
          failure_reason: payment.failureReason,
          attempt_number: payment.attemptNumber,
          timestamp: payment.timestamp,
        }]);

      if (error) {
        console.error('Error saving payment to Supabase:', error);
        // Rollback local state on error
        setPayments(prev => prev.filter(p => p.id !== payment.id));
      }
    } catch (error) {
      console.error('Error in addPayment:', error);
    }
  };

  const updatePayment = async (id: string, updates: Partial<SimulatedPayment>) => {
    try {
      // Update local state immediately
      setPayments(prev =>
        prev.map(p => p.id === id ? { ...p, ...updates } : p)
      );
      if (currentPayment?.id === id) {
        setCurrentPayment(prev => prev ? { ...prev, ...updates } : null);
      }

      // Update in Supabase
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.failureType) dbUpdates.failure_type = updates.failureType;
      if (updates.failureReason) dbUpdates.failure_reason = updates.failureReason;
      if (updates.attemptNumber) dbUpdates.attempt_number = updates.attemptNumber;

      const { error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Error updating payment in Supabase:', error);
      }
    } catch (error) {
      console.error('Error in updatePayment:', error);
    }
  };

  const getMetrics = (): PaymentMetrics => {
    const totalTransactions = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'success' || p.status === 'retry_success').length;
    const failedPayments = payments.filter(p => p.status === 'failed' || p.status === 'retry_failed').length;
    const retriedPayments = payments.filter(p => p.retryAttempts && p.retryAttempts.length > 0).length;
    const successfulRetries = payments.filter(p => p.status === 'retry_success').length;

    const totalRevenue = payments
      .filter(p => p.status === 'success' || p.status === 'retry_success')
      .reduce((sum, p) => sum + p.amount, 0);

    const recoveredRevenue = payments
      .filter(p => p.status === 'retry_success')
      .reduce((sum, p) => sum + p.amount, 0);

    const successRate = totalTransactions > 0 ? (successfulPayments / totalTransactions) * 100 : 0;
    const retrySuccessRate = retriedPayments > 0 ? (successfulRetries / retriedPayments) * 100 : 0;

    return {
      totalTransactions,
      successfulPayments,
      failedPayments,
      retriedPayments,
      successfulRetries,
      totalRevenue,
      recoveredRevenue,
      successRate,
      retrySuccessRate,
    };
  };

  const clearHistory = async () => {
    try {
      // Clear local state immediately
      setPayments([]);
      setCurrentPayment(null);

      // Clear from Supabase
      const { error } = await supabase
        .from('transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.error('Error clearing history from Supabase:', error);
      }
    } catch (error) {
      console.error('Error in clearHistory:', error);
    }
  };

  return (
    <PaymentContext.Provider value={{
      payments,
      currentPayment,
      addPayment,
      updatePayment,
      setCurrentPayment,
      getMetrics,
      clearHistory,
      isLoading,
    }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePaymentContext must be used within PaymentProvider');
  }
  return context;
}

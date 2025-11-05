import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { SimulatedPayment, PaymentMetrics } from '../types/simulator.types';

interface PaymentContextType {
  payments: SimulatedPayment[];
  currentPayment: SimulatedPayment | null;
  addPayment: (payment: SimulatedPayment) => void;
  updatePayment: (id: string, updates: Partial<SimulatedPayment>) => void;
  setCurrentPayment: (payment: SimulatedPayment | null) => void;
  getMetrics: () => PaymentMetrics;
  clearHistory: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<SimulatedPayment[]>([]);
  const [currentPayment, setCurrentPayment] = useState<SimulatedPayment | null>(null);

  const addPayment = (payment: SimulatedPayment) => {
    setPayments(prev => [payment, ...prev]);
  };

  const updatePayment = (id: string, updates: Partial<SimulatedPayment>) => {
    setPayments(prev =>
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    );
    if (currentPayment?.id === id) {
      setCurrentPayment(prev => prev ? { ...prev, ...updates } : null);
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

  const clearHistory = () => {
    setPayments([]);
    setCurrentPayment(null);
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

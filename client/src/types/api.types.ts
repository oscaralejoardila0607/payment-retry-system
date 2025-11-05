export type FailureType =
  | 'insufficient_funds'
  | 'card_declined'
  | 'network_timeout'
  | 'processor_downtime'
  | 'invalid_card_details'
  | 'card_stolen';

export type PaymentProcessor = 'stripe' | 'pse' | 'nequi';

export interface TransactionRequest {
  transactionId: string;
  merchantId: string;
  amount: number;
  currency?: string;
  failureType: FailureType;
  failureCode?: string;
  failureReason?: string;
  timestamp?: string;
  paymentProcessor: PaymentProcessor;
  cardLastFour?: string;
  attemptNumber?: number;
  merchantConfig?: {
    maxRetries?: number;
    enableAutoRetry?: boolean;
  };
}

export interface RetryAttempt {
  attemptNumber: number;
  scheduledAt: string;
  intervalSeconds: number;
  reason: string;
}

export interface MLFactor {
  factor: number;
  impact: string;
}

export interface MLPredictionDetails {
  baseProbability: number;
  adjustedProbability: number;
  confidence: number;
  factors: {
    timeOfDay: MLFactor;
    dayOfWeek: MLFactor;
    transactionAmount: MLFactor;
    merchantCategory: MLFactor;
    historicalSuccess: MLFactor;
  };
}

export interface RetryRecommendation {
  nextRetryAt: string | null;
  retryIntervalSeconds: number;
  maxRetries: number;
  currentAttempt: number;
  remainingRetries: number;
  retrySchedule: RetryAttempt[];
  mlEnhanced?: boolean;
  predictionDetails?: MLPredictionDetails;
}

export interface Reasoning {
  failureCategory: string;
  confidence: number;
  factors: string[];
  riskAssessment: string;
}

export interface CostAnalysis {
  retryFeePerAttempt: number;
  totalRetryCost: number;
  potentialRevenue: number;
  expectedRevenue: number;
  roi: number;
  worthRetrying: boolean;
  processor?: string;
}

export interface ComplianceChecks {
  withinRateLimit: boolean;
  rateLimitRemaining: number;
  rateLimitResetAt: string;
  pciCompliant: boolean;
  dataRetentionCompliant?: boolean;
  processor: string;
}

export interface RecommendedAction {
  action: string;
  message: string;
  priority: string;
}

export interface AnalysisResponse {
  transactionId: string;
  shouldRetry: boolean;
  retryRecommendation: RetryRecommendation | null;
  reasoning: Reasoning;
  estimatedSuccessProbability: number;
  costAnalysis?: CostAnalysis;
  complianceChecks: ComplianceChecks;
  recommendedAction?: RecommendedAction;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  uptime: number;
}

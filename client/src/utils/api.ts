import axios from 'axios';
import type { TransactionRequest, AnalysisResponse, HealthResponse } from '../types/api.types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeFailure = async (data: TransactionRequest): Promise<AnalysisResponse> => {
  const response = await api.post<AnalysisResponse>('/analyze-failure', data);
  return response.data;
};

export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await api.get<HealthResponse>('/health');
  return response.data;
};

export default api;

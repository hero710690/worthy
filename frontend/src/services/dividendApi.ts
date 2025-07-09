import axios from 'axios';
import type { 
  Dividend, 
  CreateDividendRequest, 
  ProcessDividendRequest, 
  DividendResponse,
  YahooDividendData 
} from '../types/dividends';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('worthy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dividendAPI = {
  // Get all dividends for user
  getDividends: async (): Promise<DividendResponse> => {
    const response = await apiClient.get('/dividends');
    return response.data;
  },

  // Get dividend data from Yahoo Finance
  fetchDividendData: async (symbols: string[]): Promise<YahooDividendData[]> => {
    const response = await apiClient.get(`/api/dividend-data?symbols=${symbols.join(',')}`);
    return response.data.dividends;
  },

  // Create dividend manually
  createDividend: async (data: CreateDividendRequest): Promise<Dividend> => {
    const response = await apiClient.post('/dividends', data);
    return response.data.dividend;
  },

  // Process dividend (reinvest or add to cash)
  processDividend: async (data: ProcessDividendRequest): Promise<{ message: string }> => {
    const response = await apiClient.post(`/dividends/${data.dividend_id}/process`, data);
    return response.data;
  },

  // Delete dividend
  deleteDividend: async (dividendId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/dividends/${dividendId}`);
    return response.data;
  },

  // Auto-detect dividends for user's assets
  autoDetectDividends: async (): Promise<{ detected: number; message: string }> => {
    const response = await apiClient.post('/dividends/auto-detect');
    return response.data;
  }
};

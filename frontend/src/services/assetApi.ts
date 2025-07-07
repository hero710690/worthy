import axios from 'axios';
import type { 
  Asset, 
  AssetWithTransactions, 
  CreateAssetRequest, 
  CreateTransactionRequest, 
  AssetsResponse 
} from '../types/assets';

const API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development';

// Create axios instance with interceptors
const assetApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
assetApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('worthy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
assetApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('worthy_token');
      localStorage.removeItem('worthy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const assetAPI = {
  // Get all user assets
  getAssets: async (): Promise<AssetsResponse> => {
    const response = await assetApi.get('/assets');
    return response.data;
  },

  // Get specific asset with transaction history
  getAsset: async (assetId: number): Promise<AssetWithTransactions> => {
    const response = await assetApi.get(`/assets/${assetId}`);
    return response.data;
  },

  // Create new asset (initialization)
  createAsset: async (assetData: CreateAssetRequest): Promise<{ message: string; asset: Asset }> => {
    const response = await assetApi.post('/assets', assetData);
    return response.data;
  },

  // Create new transaction
  createTransaction: async (transactionData: CreateTransactionRequest): Promise<{ message: string; transaction: any }> => {
    const response = await assetApi.post('/transactions', transactionData);
    return response.data;
  },
};

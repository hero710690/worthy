import axios from 'axios';
import {
  RecurringInvestment,
  CreateRecurringInvestmentRequest,
  UpdateRecurringInvestmentRequest,
  RecurringInvestmentsResponse
} from '../types/assets';

// API base URL
const API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('worthy_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const recurringInvestmentApi = {
  // Create a new recurring investment plan
  async createRecurringInvestment(data: CreateRecurringInvestmentRequest): Promise<{ recurring_investment: RecurringInvestment; message: string }> {
    const response = await api.post('/recurring-investments', data);
    return response.data;
  },

  // Get all recurring investment plans for the user
  async getRecurringInvestments(): Promise<RecurringInvestmentsResponse> {
    const response = await api.get('/recurring-investments');
    return response.data;
  },

  // Update a recurring investment plan
  async updateRecurringInvestment(
    recurringId: number, 
    data: UpdateRecurringInvestmentRequest
  ): Promise<{ recurring_investment: RecurringInvestment; message: string }> {
    const response = await api.put(`/recurring-investments/${recurringId}`, data);
    return response.data;
  },

  // Delete a recurring investment plan
  async deleteRecurringInvestment(recurringId: number): Promise<{ message: string }> {
    const response = await api.delete(`/recurring-investments/${recurringId}`);
    return response.data;
  },

  // Pause/Resume a recurring investment plan
  async toggleRecurringInvestment(recurringId: number, isActive: boolean): Promise<{ recurring_investment: RecurringInvestment; message: string }> {
    const response = await api.put(`/recurring-investments/${recurringId}`, { is_active: isActive });
    return response.data;
  }
};

import axios from 'axios';
import {
  FIREProfile,
  CreateFIREProfileRequest,
  FIREProfileResponse,
  FIREProgressResponse
} from '../types/fire';

import { API_BASE_URL } from './config';

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

export const fireApi = {
  // Create or update FIRE profile
  async createOrUpdateFIREProfile(data: CreateFIREProfileRequest): Promise<{ fire_profile: FIREProfile; message: string }> {
    const response = await api.post('/fire-profile', data);
    return response.data;
  },

  // Alias for create
  async createFIREProfile(data: CreateFIREProfileRequest): Promise<{ fire_profile: FIREProfile; message: string }> {
    return this.createOrUpdateFIREProfile(data);
  },

  // Alias for update
  async updateFIREProfile(data: CreateFIREProfileRequest): Promise<{ fire_profile: FIREProfile; message: string }> {
    return this.createOrUpdateFIREProfile(data);
  },

  // Get FIRE profile
  async getFIREProfile(): Promise<FIREProfileResponse> {
    const response = await api.get('/fire-profile');
    return response.data;
  },

  // Get FIRE progress and calculations
  async getFIREProgress(): Promise<FIREProgressResponse> {
    const response = await api.get('/fire-progress');
    return response.data;
  }
};

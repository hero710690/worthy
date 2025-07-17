import api from './api';
import type { User } from '../types/auth';

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  base_currency?: string;
  birth_year?: number;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export const userAPI = {
  // Update user profile
  updateProfile: async (data: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
    try {
      console.log('🔄 Attempting to update user profile via API:', data);
      console.log('🔍 API URL:', api.defaults.baseURL + '/user/profile');
      console.log('🔑 Auth Token Present:', !!localStorage.getItem('worthy_token'));
      
      // Try the API endpoint
      const response = await api.put('/user/profile', data);
      console.log('✅ Profile updated successfully via API:', response.data);
      
      // Log the updated user data
      console.log('👤 Updated User Data:', response.data.user);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ API profile update failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Check if the API is available
      try {
        console.log('🔍 Testing API availability...');
        const testResponse = await api.get('/auth/verify');
        console.log('✅ API is available, token verification succeeded:', testResponse.data);
      } catch (testError: any) {
        console.error('❌ API availability test failed:', testError.message);
      }
      
      // Don't use fallback - throw the error so user knows it failed
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to update profile. Please check your connection and try again.'
      );
    }
  },

  // Get user profile
  getProfile: async (): Promise<{ user: User }> => {
    try {
      console.log('🔍 Attempting to get user profile from API');
      console.log('🔑 Auth Token Present:', !!localStorage.getItem('worthy_token'));
      
      // First try the API endpoint
      const response = await api.get('/user/profile');
      console.log('✅ Profile retrieved successfully from API:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get profile from API:', error.message);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Fallback: Get from local storage
      console.log('⚠️ Using fallback: Getting profile from localStorage');
      const userStr = localStorage.getItem('worthy_user');
      console.log('📦 User data in localStorage:', userStr ? 'Present' : 'Missing');
      
      const user = JSON.parse(userStr || '{}');
      console.log('👤 User from localStorage:', user);
      return { user };
    }
  },
};

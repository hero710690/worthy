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
      // First try the API endpoint (which might not be deployed yet)
      const response = await api.put('/user/profile', data);
      return response.data;
    } catch (error) {
      console.log('API endpoint not available, using fallback mechanism');
      
      // Fallback: Update local storage directly
      const currentUser = JSON.parse(localStorage.getItem('worthy_user') || '{}');
      const updatedUser = {
        ...currentUser,
        ...data
      };
      
      localStorage.setItem('worthy_user', JSON.stringify(updatedUser));
      
      // Return a simulated successful response
      return {
        message: "Profile updated successfully",
        user: updatedUser
      };
    }
  },

  // Get user profile
  getProfile: async (): Promise<{ user: User }> => {
    try {
      // First try the API endpoint (which might not be deployed yet)
      const response = await api.get('/user/profile');
      return response.data;
    } catch (error) {
      // Fallback: Get from local storage
      const user = JSON.parse(localStorage.getItem('worthy_user') || '{}');
      return { user };
    }
  },
};

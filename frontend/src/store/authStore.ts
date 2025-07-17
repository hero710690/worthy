import { create } from 'zustand';
import type { AuthState, User, LoginRequest, RegisterRequest } from '../types/auth';
import { authAPI } from '../services/api';
import { userAPI, type UpdateProfileRequest } from '../services/userApi';

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  verifyToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
  startTokenRefresh: () => void;
  stopTokenRefresh: () => void;
  updateProfile: (profileData: UpdateProfileRequest) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state - start with loading true since we need to check localStorage
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true
  error: null,

  // Initialize auth state from localStorage
  initialize: () => {
    set({ isLoading: true }); // Set loading during initialization
    
    const token = localStorage.getItem('worthy_token');
    const userStr = localStorage.getItem('worthy_user');
    
    if (!token || !userStr) {
      set({ 
        isAuthenticated: false, 
        user: null, 
        token: null, 
        isLoading: false 
      });
      return;
    }

    try {
      const user: User = JSON.parse(userStr);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      // Start automatic token refresh
      get().startTokenRefresh();
      
      // Optionally verify token with backend
      // This ensures the token is still valid
      get().verifyToken().catch(() => {
        // If token verification fails, logout
        get().logout();
      });
    } catch (error) {
      localStorage.removeItem('worthy_token');
      localStorage.removeItem('worthy_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // Start automatic token refresh
  startTokenRefresh: () => {
    // Clear any existing refresh interval
    const existingInterval = (window as any).worthyTokenRefreshInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up token refresh every 20 minutes (tokens expire in 24 hours)
    const refreshInterval = setInterval(async () => {
      const state = get();
      if (state.isAuthenticated && state.token) {
        try {
          await authAPI.refreshToken();
          console.log('Token refreshed automatically');
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          // If refresh fails, logout user
          get().logout();
        }
      }
    }, 20 * 60 * 1000); // 20 minutes

    // Store interval reference globally so it can be cleared
    (window as any).worthyTokenRefreshInterval = refreshInterval;
  },

  // Stop automatic token refresh
  stopTokenRefresh: () => {
    const existingInterval = (window as any).worthyTokenRefreshInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
      delete (window as any).worthyTokenRefreshInterval;
    }
  },

  // Actions
  login: async (credentials: LoginRequest) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAPI.login(credentials);
      
      // Store token and user data
      localStorage.setItem('worthy_token', response.token);
      localStorage.setItem('worthy_user', JSON.stringify(response.user));
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Start automatic token refresh
      get().startTokenRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null,
        token: null,
      });
      throw error;
    }
  },

  register: async (userData: RegisterRequest) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAPI.register(userData);
      
      // Store token and user data
      localStorage.setItem('worthy_token', response.token);
      localStorage.setItem('worthy_user', JSON.stringify(response.user));
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null,
        token: null,
      });
      throw error;
    }
  },

  logout: () => {
    // Stop automatic token refresh
    get().stopTokenRefresh();
    
    // Clear local storage
    localStorage.removeItem('worthy_token');
    localStorage.removeItem('worthy_user');
    
    // Clear state
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
    });

    // Call logout API (optional, fire and forget)
    authAPI.logout().catch(console.error);
  },

  verifyToken: async () => {
    const state = get();

    // If already authenticated and not loading, skip verification
    if (state.isAuthenticated && !state.isLoading) {
      return;
    }

    const token = localStorage.getItem('worthy_token');
    const userStr = localStorage.getItem('worthy_user');
    
    if (!token || !userStr) {
      set({ 
        isAuthenticated: false, 
        user: null, 
        token: null, 
        isLoading: false 
      });
      return;
    }

    try {
      set({ isLoading: true });
      
      // Verify token with backend
      await authAPI.verifyToken();
      
      // Token is valid, restore user state
      const user: User = JSON.parse(userStr);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // Token is invalid, clear everything
      localStorage.removeItem('worthy_token');
      localStorage.removeItem('worthy_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  updateProfile: async (profileData: UpdateProfileRequest) => {
    try {
      set({ isLoading: true, error: null });
      
      // Call API to update profile
      const response = await userAPI.updateProfile(profileData);
      
      // Update local storage with new user data
      localStorage.setItem('worthy_user', JSON.stringify(response.user));
      
      // Update state
      set({
        user: response.user,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },
}));

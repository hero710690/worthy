import { create } from 'zustand';
import type { AuthState, User, LoginRequest, RegisterRequest } from '../types/auth';
import { authAPI } from '../services/api';

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  verifyToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initialize auth state from localStorage
  initialize: () => {
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
}));

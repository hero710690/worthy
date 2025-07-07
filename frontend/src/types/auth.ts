export interface User {
  user_id: number;
  name: string;
  email: string;
  base_currency: string;
  birth_year: number;
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  base_currency: string;
  birth_year: number;
}

export interface AuthError {
  error: boolean;
  message: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

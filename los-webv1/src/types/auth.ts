
// File: src/types/auth.ts
export interface AuthState {
    accessToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    user: any | null;
  }
  
  export interface LoginResponse {
    accessToken: string;
    user: any;
  }
  
  export interface RefreshResponse {
    accessToken: string;
  }
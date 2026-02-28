/**
 * Authentication utilities for token management and debugging
 */

export interface AuthTokens {
  accessToken: string;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  brandId: string | null;
  role: string[];
  permissions: string[];
  reportsToId: string | null;
  userPermissions: any[];
}

export interface LoginResponse {
  accessToken: string;
  data: UserData;
}

/**
 * Safely store authentication tokens in sessionStorage
 */
export const storeAuthTokens = (response: LoginResponse): void => {
  try {
    if (response.accessToken) {
      sessionStorage.setItem("access_token", response.accessToken);
    }
    console.log("✅ Auth tokens stored successfully");
  } catch (error) {
    console.error("❌ Error storing auth tokens:", error);
    throw new Error("Failed to store authentication tokens");
  }
};

/**
 * Retrieve authentication token from sessionStorage
 */
export const getAuthToken = (): string | null => {
  try {
    return sessionStorage.getItem("access_token");
  } catch (error) {
    console.error("❌ Error retrieving auth token:", error);
    return null;
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  try {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("partnerUser");
    console.log("✅ Auth data cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing auth data:", error);
  }
};

/**
 * Check if user is authenticated by validating token presence
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token && token.length > 0;
};

/**
 * Debug authentication state
 */
export const debugAuthState = (): void => {
  console.group("🔍 Authentication State Debug");
  try {
    const token = getAuthToken();
    const userDataStored = sessionStorage.getItem("partnerUser");
    
    console.log("Token present:", !!token);
    console.log("Token length:", token?.length || 0);
    console.log("User data stored:", !!userDataStored);
    
    if (token) {
      // Basic token validation (just check format)
      const tokenParts = token.split(".");
      console.log("Token format valid (JWT):", tokenParts.length === 3);
    }
    
    // Check axios defaults
    console.log("SessionStorage keys:", Object.keys(sessionStorage));
    
  } catch (error) {
    console.error("❌ Error debugging auth state:", error);
  }
  console.groupEnd();
};

/**
 * Validate login response format
 */
export const validateLoginResponse = (response: any): response is LoginResponse => {
  if (!response) {
    console.error("❌ Login response is null/undefined");
    return false;
  }
  
  if (!response.accessToken) {
    console.error("❌ Login response missing accessToken");
    return false;
  }
  
  if (!response.data) {
    console.error("❌ Login response missing data");
    return false;
  }
  
  const requiredDataFields = ['id', 'email', 'name', 'role', 'permissions'];
  for (const field of requiredDataFields) {
    if (!(field in response.data)) {
      console.error(`❌ Login response data missing required field: ${field}`);
      return false;
    }
  }
  
  console.log("✅ Login response format is valid");
  return true;
};

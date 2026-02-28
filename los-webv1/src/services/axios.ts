import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { store } from "../redux/store";
import Configuration from "./config";
import { logout, refreshToken } from "./api/auth.api";
import { updateAccessToken } from "../redux/slices/user";
// This is the base URL for the API. It should be set in your environment variables or configuration file.
const BASE_URL = Configuration.baseUrl;

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token as string);
    }
  });
  failedQueue = [];
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL + "/api/v1",
  headers: {
    "Content-Type": "application/json",
    domain: window.location.host || "localhost",
      
  },
  withCredentials: true, // Important for sending/receiving cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.user.accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalRequest = error.config as any;
    const status = error.response ? error.response.status : null;

    // Only handle 401 errors for requests that aren't for refreshing tokens
    if (
      status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes("auth/refresh-token")
    ) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const result = await refreshToken();

        const newToken = result.accessToken;
        store.dispatch(updateAccessToken(newToken));

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        window.location.href = "/phone-verification";
        localStorage.clear();
        try {
          await logout();
        } catch (error) {
          console.error("Error logging out:", error);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data);
  }
);

export default api;

// ==================== Versioned API Instances ====================

/**
 * Creates a versioned axios instance with full interceptor support
 * Reuses shared interceptor logic to avoid duplication
 */
const createVersionedApi = (version: string): AxiosInstance => {
  const versionedApi = axios.create({
    baseURL: `${Configuration.baseUrl}/api/${version}`,
    headers: {
      "Content-Type": "application/json",
      domain: window.location.host || "localhost",
    },
    withCredentials: true,
  });

  // Share the same interceptor setup
  setupInterceptors(versionedApi);
  return versionedApi;
};

/**
 * Setup request/response interceptors for any axios instance
 */
const setupInterceptors = (instance: AxiosInstance): void => {
  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      const state = store.getState();
      const token = state.user.accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;
      const status = error.response ? error.response.status : null;

      if (
        status === 401 &&
        !originalRequest?._retry &&
        !originalRequest?.url?.includes("auth/refresh-token")
      ) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const result = await refreshToken();
          const newToken = result.accessToken;
          store.dispatch(updateAccessToken(newToken));
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          window.location.href = "/phone-verification";
          localStorage.clear();
          try {
            await logout();
          } catch (error) {
            console.error("Error logging out:", error);
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error.response?.data);
    }
  );
};

// Export versioned instances
export const apiV2 = createVersionedApi("v2");
export const apiV3 = createVersionedApi("v3"); // Easy to add future versions

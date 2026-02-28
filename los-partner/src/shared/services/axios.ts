import axios from "axios";
import Configuration from "./config";
const BASE_URL = Configuration.baseUrl;

const api = axios.create({
  baseURL: BASE_URL + "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("access_token");
    if (token) {
      config.headers["authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: handle unauthorized responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    if (error.response?.status === 401) {
      // Clear session storage on unauthorized access
      sessionStorage.clear();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    // Create a proper Error object while preserving error data
    const errorMessage = error.response?.data?.message || error.message || "Network error";
    const customError = new Error(errorMessage);
    // Attach the original response for detailed error handling
    (customError as any).response = error.response;
    return Promise.reject(customError);
  }
);

export default api;

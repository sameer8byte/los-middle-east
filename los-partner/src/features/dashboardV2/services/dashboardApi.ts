import axios from "../../../shared/services/axios";
import type {
  CollectionOverviewData,
  CollectionSummaryData,
  ApplicationData,
  PerformanceScoreData,
} from "../types/dashboard.types";

// 🔴 API INTEGRATION POINT - Replace with actual endpoint
export const getCollectionOverview = async (): Promise<CollectionOverviewData> => {
  const response = await axios.get("/api/collection-executive/overview");
  return response.data;
};

// 🔴 API INTEGRATION POINT - Replace with actual endpoint
export const getCollectionSummary = async (): Promise<CollectionSummaryData> => {
  const response = await axios.get("/api/collection-executive/summary");
  return response.data;
};

// 🔴 API INTEGRATION POINT - Replace with actual endpoint
export const getApplications = async (): Promise<ApplicationData> => {
  const response = await axios.get("/api/collection-executive/applications");
  return response.data;
};

// 🔴 API INTEGRATION POINT - Replace with actual endpoint
export const getPerformanceScore = async (): Promise<PerformanceScoreData> => {
  const response = await axios.get("/api/collection-executive/performance");
  return response.data;
};

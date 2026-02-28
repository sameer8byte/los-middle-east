import { Pagination } from "../../types/pagination";
import api from "../axios";

export const getCollection = async (
  brandId: string,
  paginationDto: Pagination,
  filter?: Record<string, string>
) => {
  try {
    const params = new URLSearchParams();
    params.append("page", String(paginationDto?.page || "1"));
    params.append("limit", String(paginationDto?.limit || "10"));
    
    if (paginationDto?.dateFilter) {
      params.append("dateFilter", paginationDto.dateFilter);
    }
    if (filter?.status) {
      params.append("status", filter.status);
    }
    if (filter?.search) {
      params.append("search", filter.search);
    }
    if (filter?.assignedCollectionExecutive) {
      params.append("assignedCollectionExecutive", filter.assignedCollectionExecutive);
    }
    if (filter?.assignedCollectionSupervisor) {
      params.append("assignedCollectionSupervisor", filter.assignedCollectionSupervisor);
    }

    const response = await api.get(
      `/partner/brand/${brandId}/collection?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching collection:", error);
    throw error;
  }
};


export const postCollection = async (
  brandId: string,
  paginationDto: Pagination,
  filter?: Record<string, string>
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/collection/post?page=${
        paginationDto?.page || "1"
      }&limit=${paginationDto?.limit || "10"}${
        paginationDto?.dateFilter
          ? `&dateFilter=${paginationDto.dateFilter}`
          : ""
      }&status=${filter?.status ? filter.status : ""}&search=${
        filter?.search ? filter.search : ""
      }${filter?.assignedCollectionExecutive ? `&assignedCollectionExecutive=${filter.assignedCollectionExecutive}` : ""}${filter?.assignedCollectionSupervisor ? `&assignedCollectionSupervisor=${filter.assignedCollectionSupervisor}` : ""}`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};


export const preCollection = async (
  brandId: string,
  paginationDto: Pagination,
  filter?: Record<string, string>
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/collection/pre?page=${
        paginationDto?.page || "1"
      }&limit=${paginationDto?.limit || "10"}${
        paginationDto?.dateFilter
          ? `&dateFilter=${paginationDto.dateFilter}`
          : ""
      }&status=${filter?.status ? filter.status : ""}&search=${
        filter?.search ? filter.search : ""
      }${filter?.assignedCollectionExecutive ? `&assignedCollectionExecutive=${filter.assignedCollectionExecutive}` : ""}${filter?.assignedCollectionSupervisor ? `&assignedCollectionSupervisor=${filter.assignedCollectionSupervisor}` : ""}`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getRepaymentTimeline = async (loanId:string,brandId:string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/collection/repayment-timeline?loanId=${loanId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching repayment timeline:", error);
    throw error;
  }
};

export const createRepaymentTimeline = async (
  brandId: string,
  data: FormData
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/collection/repayment-timeline`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating repayment timeline:", error);
    throw error;
  }
};


export const getRecording = async (
  brandId: string,
  userCallRecordingsId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/call-requests/recording`,
      { userCallRecordingsId }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching call recording:", error);
    throw error;
  }
}
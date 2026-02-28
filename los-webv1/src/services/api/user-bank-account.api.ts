import { UserBankAccount } from "../../types/user-bank-account";
import api from "../axios";

export const getAccount = async (id: string) => {
  try {
    const response = await api.get(`/web/bank/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching account:", error);
    throw error;
  }
};
export const updateAccount = async (id: string, data: UserBankAccount) => {
  try {
    const response = await api.post(`/web/bank/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
};

export const getBankAccountStatement = async (bankAccountId: string) => {
  try {
    const response = await api.get(`/web/bank/${bankAccountId}/statement`);
    return response.data;
  } catch (error) {
    console.error("Error fetching bank account statement:", error);
    throw error;
  }
};

export const uploadBankAccountStatement = async (bankAccountId:string,data: FormData) => {
  try {
    const response = await api.post(`/web/bank/${bankAccountId}/statement`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading bank account statement:", error);
    throw error;
  }
};

export const deleteBankAccountStatement = async (bankAccountId:string,id: string) => {
  try {
    const response = await api.delete(`/web/bank/${bankAccountId}/statement/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting bank account statement:", error);
    throw error;
  }
};

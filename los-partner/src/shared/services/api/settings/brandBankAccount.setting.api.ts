import { BrandBankAccountType } from "../../../../constant/enum";
import api from "../../axios";

export const getBrandBankAccounts = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand-bank-account`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};
export const getBrandBankAccount = async (
  brandId: string,
  bankAccountId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand-bank-account/${bankAccountId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};
 
export const createBrandBankAccount = async (
  brandId: string,
  bankAccountData: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    type?: BrandBankAccountType; // Optional, if you want to specify the type of bank account
    branchName?: string;
    upiId?: string;
    bankAddress?: string;
    isPrimaryAccount?: boolean;
    isActive?: boolean;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-bank-account`,
      bankAccountData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating brand bank account:", error);
    throw error;
  }
};
export const updateBrandBankAccount = async (
  brandId: string,
  bankAccountId: string,
  bankAccountData: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
    type?: BrandBankAccountType; // Optional, if you want to specify the type of bank account
    upiId?: string;
    bankAddress?: string;
    isPrimaryAccount?: boolean;
    isActive?: boolean;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-bank-account/${bankAccountId}`,
      bankAccountData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating brand bank account:", error);
    throw error;
  }
};

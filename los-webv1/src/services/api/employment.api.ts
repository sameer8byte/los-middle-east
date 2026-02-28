
import { Employment } from "../../types/employment";
import api from "../axios";

export const getEmployment = async (id: string) => {
  try {
    const response = await api.get(`/web/employment/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching employment data:", error);
    throw error;
  }
}
export const patchUpdateEmployment = async (
  id: string,
  data: Partial<Employment>
) => {
  try {
    const response = await api.patch(`/web/employment/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating employment:", error);
    throw error;
  }
}

export const createPayslip = async (data: FormData) => {
  try {
    const response = await api.post("/web/employment/payslips", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading payslip:", error);
    throw error;
  }
}
export const getPayslip = async (employmentId: string) => {
  try {
    const response = await api.get(`/web/employment/${employmentId}/payslips`);
    return response.data;
  } catch (error) {
    console.error("Error fetching payslip data:", error);
    throw error;
  }
}
export const deletePayslip = async (payslipId: string) => {
  try {
    const response = await api.delete(`/web/employment/payslips/${payslipId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting payslip data:", error);
    throw error;
  }
}

export const updateUserProfile = async (userId: string, data: any) => {
  try {
    const response = await api.patch(`/web/home/${userId}/profile`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

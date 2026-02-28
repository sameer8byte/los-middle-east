

import { UserDevice } from "../../types/user-devices";
import api from "../axios";


export const registerUserDevice = async (brandId: string|null, data:Partial<UserDevice>) => {
    try {
        const response = await api.post(`/users/${brandId}/devices`, data);
        return response.data;
    } catch (error) {
        console.error("Error registering user device:", error);
        throw error;
    }
}

export const deleteUserDevice = async (brandId: string, deviceId: string) => {
    try {
        const response = await api.delete(`/users/${brandId}/devices/${deviceId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting user device:", error);
        throw error;
    }
}




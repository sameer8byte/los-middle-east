
 import { AlternateAddress } from "../../types/user-details";
import api from "../axios";

export const getAlternateAddressByUserId = async (userId: string) => {
    try {
        const response = await api.get(`/alternate-addresses/by-userId/${userId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching alternate address by userId:", error);
        throw error;
    }
}

 

export const updateAlternateAddress = async (
    userId: string,
    address: Partial<AlternateAddress>
) => {
    try {
        const response = await api.patch(
            `web/personal-details/alternate-address/${userId}`,
            address
        );
        return response.data;
    } catch (error) {
        console.error("Error updating alternate address:", error);
        throw error;
    }
}









import { CallMeRequest } from "../../types/call-me-request";
import api from "../axios";


export const createCallMeRequest = async ( data: CallMeRequest) => {
    try {
         const response = await api.post(`/call-me-requests`, data);
        return response.data;
    } catch (error) {
        console.error("Error registering user device:", error);
        throw error;
    }
}
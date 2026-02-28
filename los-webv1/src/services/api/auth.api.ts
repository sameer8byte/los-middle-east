import api from "../axios"

export const sendSms = async (phone: string, brandId: string) => {
    try {
        const response = await api.post("/auth/send-sms", {
            phone,
            brandId,
        });
        return response.data;
    } catch (error) {
        console.error("Error sending SMS:", error);
        throw error;
    }
}

export const sendEmail = async (email: string, brandId: string, userId: string) => {
    try {
        const response = await api.post("/auth/send-email", {
            email,
            brandId,
            userId
        });
        return response.data;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}

export const verifyOtp = async (otp: string, brandId: string, userId: string, type: string, deviceId: string ) => {
    try {
        const response = await api.post("/auth/verify", {
            otp,
            brandId,
            userId,
            type,
            deviceId
        });
        return response.data;
    } catch (error) {
        console.error("Error verifying OTP:", error);
        throw error;
    }
}

export const googleLogin = async (credentials: string,userId:string, brandId: string,deviceId:string) => {
    try {
        const response = await api.post("/auth/google-login", {
            credentials,
            userId,
            brandId,
            deviceId
        });
        return response.data;
    } catch (error) {
        console.error("Error logging in with Google:", error);
        throw error;
    }
}

export const refreshToken = async () => {
    try {
        const response = await api.post("/auth/refresh-token",{});
        return response.data;
    } catch (error) {
        console.error("Error refreshing token:", error);
        throw error;
    }
}



export const logout = async () => {
    try {
        const response = await api.post("/auth/logout",{});
        return response.data;
    } catch (error) {
        console.error("Error logout:", error);
        throw error;
    }
}
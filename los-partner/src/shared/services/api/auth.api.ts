import api from "../axios";

export const postLogin = async (data: {
  email: string;
  password: string;
  deviceId: string;
}) => {
  try {
    const response = await api.post("/auth/partner/login", data);
    return response.data;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};


export const logout = async () => {
  try {
    const response = await api.post("/auth/partner/logout", {});
    return response.data;
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

export const sendResetPasswordEmail = async (email: string) => {
  try {
    const response = await api.post("/auth/partner/send-reset-password-email", { email });
    return response.data;
  } catch (error) {
    console.error("Error sending reset password email:", error);
    throw error;
  }
};
export const resetPassword = async (token: string, newPassword: string) => {
  try {
    const response = await api.post("/auth/partner/reset-password", { token, newPassword });
    return response.data;
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const response = await api.post("/auth/partner/change-password", { 
      currentPassword, 
      newPassword 
    });
    return response.data;
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
};
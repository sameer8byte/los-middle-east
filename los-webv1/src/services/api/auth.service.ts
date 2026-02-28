import { apiV2 } from "../axios";

interface SendSignupOtpV2Payload {
  phoneNumber: string;
  occupationTypeId: number | string | null;
  monthlySalary: string;
  panCard: string;
  brandId: string;
}

interface VerifyOtpPayload {
  otp: string;
  type: "email" | "phone";
  brandId: string;
  userId: string;
  deviceId: string;
}

interface AuthResponse {
  onboardingStep: number;
  id: string;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    onboardingStep: number;
    isEmailVerified: boolean;
    brandId: string;
    isPhoneVerified: boolean;
    googleId: string;
    employmentId: string;
    userDetailsId: string;
    userBankAccountId: string;
    status_id: number | null;
    is_terms_accepted: boolean;
    occupation_type_id: number | null;
  };
  accessToken: string;
  message: string;
}

class AuthService {
  /**
   * Send signup OTP with complete form data (v2)
   */
  async sendSignupOtpV2(
    payload: SendSignupOtpV2Payload,
  ): Promise<AuthResponse> {
    try {
      const response = await apiV2.post("/auth/send-signup", payload);
      return response.data;
    } catch (error: any) {
      console.error("SendSignupOtpV2 Error:", error);
      throw error;
    }
  }

  /**
   * Verify OTP (v2)
   */
  async verifyOtp(payload: VerifyOtpPayload) {
    try {
      const response = await apiV2.post("/auth/verify", payload);
      return response.data;
    } catch (error: any) {
      console.error("VerifyOtp Error:", error);
      throw error;
    }
  }

  /**
   * Send SMS OTP (v2)
   */
  async sendSmsOtp(phoneNumber: string, brandId: string) {
    try {
      const response = await apiV2.post("/auth/send-sms", {
        phone: phoneNumber,
        brandId: brandId,
      });
      return response.data;
    } catch (error: any) {
      console.error("SendSmsOtp Error:", error);
      throw error;
    }
  }

  async googleLogin(
    credentials: string,
    userId: string,
    brandId: string,
    deviceId: string,
  ) {
    try {
      const response = await apiV2.post("/auth/google-login", {
        credentials,
        userId,
        brandId,
        deviceId,
      });
      return response.data;
    } catch (error) {
      console.error("Error logging in with Google:", error);
      throw error;
    }
  }
}

export default new AuthService();

import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";

export interface ClickToDialRequest {
  destination_number: string; // Customer phone number
  agent_number: string; // Agent phone number
}

export interface ClickToDialResponse {
  status: boolean;
  message: string;
  data?: any;
}

// User Management Interfaces
export interface CreateUserRequest {
  name: string; // Name of the user
  number: string; // Mobile number of the user
  email: string; // Email ID of the user
  login_id: string; // Define login ID for web login
  user_role: number; // Role ID defined for the user
  password: string; // Define password for web login
  status: boolean; // Status of the user (true=enabled, false=disabled)
  create_agent: boolean; // Whether to create as agent
  create_web_login: boolean; // Whether to create web login
  caller_id: number[]; // Array of number IDs allotted to user
  block_web_login?: boolean; // Block access to web login
  user_for_cdr?: object; // Users defined for user to see CDRs
  login_based_calling?: boolean; // Calling works based on login
  agent_group?: string[]; // Agent groups to allot
  department?: string[]; // Departments to allot
  time_group?: string; // Time group to allot
  create_extension?: boolean; // Whether extension is to be created
  enable_calling?: boolean; // Make user workable for calling
}

export interface UserResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

export interface FetchUserResponse {
  success: boolean;
  message: string;
  data?: {
    id?: number;
    name?: string;
    number?: string;
    email?: string;
    login_id?: string;
    status?: boolean;
    role?: string;
    [key: string]: any;
  };
  error?: any;
}

// Broadcast Lead Interfaces
export interface BroadcastLeadRequest {
  field_0: string; // Customer phone number
  field_1: string; // Customer name or identifier
  field_2?: string; // Additional field (optional)
  field_3?: string; // Additional field (optional)
  field_4?: string; // Additional field (optional)
  priority?: string; // Priority level (default: "30")
  duplicate_option?: string; // How to handle duplicates (default: "clone")
  agent_user_number?: string; // Agent user number (replaces skill_id)
  skill_id?: string; // Skill ID (alternative to agent_user_number)
  [key: string]: any; // Allow additional fields
}

export interface BroadcastLeadResponse {
  status?: boolean;
  success?: boolean;
  message: string;
  data?: any;
  error?: any;
}

@Injectable()
export class AcefoneService {
  private readonly baseUrl = "https://dialer-api.acefone.in/api";
  private readonly acefoneToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.acefoneToken = this.configService.get<string>("ACEFONE_API_TOKEN");
    if (!this.acefoneToken) {
      console.warn("ACEFONE_API_TOKEN is not set in environment variables");
    }
  }

  /**
   * Initiates a click-to-dial call using broadcast lead
   * @param destination_number Customer's phone number
   * @param agent_number Agent's phone number
   * @param leadId Optional broadcast lead ID (defaults to 'manual-dial')
   * @returns ClickToDialResponse
   */
  async initiateClickToDial(
    destination_number: string,
    agent_number: string,
    leadId,
  ): Promise<ClickToDialResponse> {
    try {
      // Validate phone numbers
      if (!destination_number || !agent_number) {
        throw new BadRequestException(
          "Both destination_number and agent_number are required",
        );
      }

      // Use createBroadcastLead with the provided parameters
      const broadcastResponse = await this.createBroadcastLead(leadId, {
        field_0: destination_number,
        field_1: destination_number, // Use phone number as identifier
        
        agent_user_number: agent_number,
        priority: "30",
        duplicate_option: "clone",
      });

      return {
        status: broadcastResponse.status || true,
        message:
          broadcastResponse.message || "Click to dial initiated successfully",
        data: broadcastResponse.data,
      };
    } catch (error) {
      console.error("Acefone Click to Dial Error:", error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          status: false,
          message: "Internal server error while initiating click to dial",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Creates a broadcast lead (manual dial via broadcast)
   * @param leadId Broadcast lead ID
   * @param broadcastLeadRequest Lead data including phone number, name, priority, etc.
   * @returns BroadcastLeadResponse
   */
  async createBroadcastLead(
    leadId: string,
    broadcastLeadRequest: BroadcastLeadRequest,
  ): Promise<BroadcastLeadResponse> {
    try {
      // Validate required fields
      if (!broadcastLeadRequest.field_0) {
        throw new BadRequestException("field_0 (phone number) is required");
      }

      if (!broadcastLeadRequest.field_1) {
        throw new BadRequestException("field_1 (name/identifier) is required");
      }

      // Validate that at least one of agent_user_number or skill_id is provided
      if (
        !broadcastLeadRequest.agent_user_number &&
        !broadcastLeadRequest.skill_id
      ) {
        throw new BadRequestException(
          "Either agent_user_number or skill_id is required",
        );
      }

      // Clean phone number
      const cleanPhoneNumber = broadcastLeadRequest.field_0.replace(/\D/g, "");
      if (cleanPhoneNumber.length < 10) {
        throw new BadRequestException(
          "Phone number must be at least 10 digits",
        );
      }

      // Build request payload - preserve all fields from the request
      const payload: {
        field_0: string;
        field_1: string;
        field_2?: string;
        field_3?: string;
        field_4?: string;
        priority?: string;
        duplicate_option?: string;
        skill_id?: string;
        [key: string]: any;
      } = {
        field_0: cleanPhoneNumber,
        field_1: broadcastLeadRequest.field_1,
      };

      // Add optional field_2 if provided
      if (broadcastLeadRequest.field_2) {
        payload.field_2 = broadcastLeadRequest.field_2;
      }

      // Add priority and duplicate_option with defaults
      payload.priority = broadcastLeadRequest.priority || "30";
      payload.duplicate_option =
        broadcastLeadRequest.duplicate_option || "clone";

      // Add skill_id or map from agent_user_number
      if (broadcastLeadRequest.skill_id) {
        payload.skill_id = broadcastLeadRequest.skill_id;
      } else if (broadcastLeadRequest.agent_user_number) {
        payload.skill_id = broadcastLeadRequest.agent_user_number;
      }

      // Add any additional custom fields (excluding the ones we already handled)
      const excludedFields = [
        "field_0",
        "field_1",
        "field_2",
        "field_3",
        "field_4",
        "priority",
        "duplicate_option",
        "skill_id",
        "agent_user_number",
      ];
      for (const [key, value] of Object.entries(broadcastLeadRequest)) {
        if (!excludedFields.includes(key) && value !== undefined) {
          payload[key] = value;
        }
      }

      const url = `https://api.acefone.in/v1/broadcast/lead/${leadId}`;

      const response = await firstValueFrom(
        this.httpService.post<BroadcastLeadResponse>(url, payload, {
          headers: {
            Authorization: `Bearer ${this.acefoneToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }),
      );

      return {
        status: true,
        message: response.data.message || "Broadcast lead created successfully",
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error("Acefone Broadcast Lead Error:", error);

      if (error instanceof AxiosError) {
        throw new HttpException(
          {
            status: false,
            message:
              error.response?.data?.message ||
              "Failed to create broadcast lead",
            error: error.response?.data?.error || error.response?.data,
          },
          error.response?.status || HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          status: false,
          message: "Internal server error while creating broadcast lead",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validates Acefone API connectivity
   * @returns Promise<boolean>
   */
  async validateApiAccess(): Promise<boolean> {
    try {
      if (!this.acefoneToken) {
        return false;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          headers: {
            Authorization: `Bearer ${this.acefoneToken}`,
          },
        }),
      );

      return response.status === 200;
    } catch (error) {
      console.error("Acefone API validation failed:", error);
      return false;
    }
  }

  /**
   * Format phone number to Indian standard
   * @param phoneNumber Raw phone number
   * @returns Formatted phone number
   */
  private formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, "");

    // If it starts with 91 (India country code), keep it as is
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      return cleaned;
    }

    // If it's 10 digits, add 91
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }

    return cleaned;
  }

  // ============================================================================
  // USER MANAGEMENT APIS
  // ============================================================================

  /**
   * Creates a new user in Acefone
   * @param createUserRequest User creation details
   * @returns UserResponse
   */
  async createUser(
    createUserRequest: CreateUserRequest,
  ): Promise<UserResponse> {
    try {
      // Validate required fields
      const requiredFields = [
        "name",
        "number",
        "email",
        "login_id",
        "user_role",
        "password",
        "create_agent",
        "create_web_login",
        "caller_id",
      ];

      for (const field of requiredFields) {
        if (!createUserRequest[field]) {
          throw new BadRequestException(`${field} is required`);
        }
      }

      // Format phone number
      const formattedNumber = this.formatPhoneNumber(createUserRequest.number);

      const payload = {
        ...createUserRequest,
        number: formattedNumber,
      };

      const response = await firstValueFrom(
        this.httpService.post<UserResponse>(
          `https://api.acefone.in/v1/user`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.acefoneToken}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      console.error("Acefone Create User Error:", error);

      if (error instanceof AxiosError) {
        throw new HttpException(
          {
            success: false,
            message: error.response?.data?.message || "Failed to create user",
            error: error.response?.data?.error,
          },
          error.response?.status || HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: "Internal server error while creating user",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches a single user details by user ID
   * @param userId User ID
   * @returns FetchUserResponse
   */
  async fetchSingleUser(userId: number): Promise<FetchUserResponse> {
    try {
      if (!userId) {
        throw new BadRequestException("User ID is required");
      }

      const response = await firstValueFrom(
        this.httpService.get<FetchUserResponse>(
          `https://api.acefone.in/v1/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${this.acefoneToken}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      console.error("Acefone Fetch User Error:", error);

      if (error instanceof AxiosError) {
        throw new HttpException(
          {
            success: false,
            message: error.response?.data?.message || "Failed to fetch user",
            error: error.response?.data?.error,
          },
          error.response?.status || HttpStatus.NOT_FOUND,
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: "Internal server error while fetching user",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches multiple users with pagination
   * @param limit Items per page (default: 10)
   * @param offset Page offset (default: 0)
   * @returns UserResponse
   */
  async fetchMultipleUsers(
    limit: number = 10,
    offset: number = 0,
  ): Promise<UserResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponse>(`https://api.acefone.in/v1/user`, {
          params: {
            limit,
            offset,
          },
          headers: {
            Authorization: `Bearer ${this.acefoneToken}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      console.error("Acefone Fetch Multiple Users Error:", error);

      if (error instanceof AxiosError) {
        throw new HttpException(
          {
            success: false,
            message:
              error.response?.data?.message || "Failed to fetch multiple users",
            error: error.response?.data?.error,
          },
          error.response?.status || HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: "Internal server error while fetching users",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Updates a user (PATCH)
   * @param userId User ID
   * @param updateData Partial user data to update
   * @returns UserResponse
   */
  async updateUser(
    userId: number,
    updateData: Partial<CreateUserRequest>,
  ): Promise<UserResponse> {
    try {
      if (!userId) {
        throw new BadRequestException("User ID is required");
      }

      // Format phone number if provided
      if (updateData.number) {
        updateData.number = this.formatPhoneNumber(updateData.number);
      }

      const response = await firstValueFrom(
        this.httpService.patch<UserResponse>(
          `https://api.acefone.in/v1/user/${userId}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${this.acefoneToken}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      console.error("Acefone Update User Error:", error);

      if (error instanceof AxiosError) {
        throw new HttpException(
          {
            success: false,
            message: error.response?.data?.message || "Failed to update user",
            error: error.response?.data?.error,
          },
          error.response?.status || HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: "Internal server error while updating user",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Deletes a user
   * @param userId User ID
   * @returns UserResponse
   */
  async deleteUser(userId: number): Promise<UserResponse> {
    try {
      if (!userId) {
        throw new BadRequestException("User ID is required");
      }

      const response = await firstValueFrom(
        this.httpService.delete<UserResponse>(
          `https://api.acefone.in/v1/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${this.acefoneToken}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      console.error("Acefone Delete User Error:", error);

      if (error instanceof AxiosError) {
        throw new HttpException(
          {
            success: false,
            message: error.response?.data?.message || "Failed to delete user",
            error: error.response?.data?.error,
          },
          error.response?.status || HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: "Internal server error while deleting user",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

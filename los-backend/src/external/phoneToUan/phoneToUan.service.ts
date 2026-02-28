import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { PrismaService } from "src/prisma/prisma.service";
import { firstValueFrom } from "rxjs";
import {
  BrandProviderType,
  BrandProviderName,
  PhoneToUanStatus,
} from "@prisma/client";
import {
  PhoneToUanRequest,
  PhoneToUanResponse,
  SignzyPhoneToUanRequest,
  SignzyPhoneToUanResponse,
  KycKartPhoneToUanResponse,
} from "./interfaces/phone-to-uan.interface";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PhoneToUanService {
  private readonly logger = new Logger(PhoneToUanService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Get the active phone to UAN provider for a brand
   */
  private async getActivePhoneToUanProvider(brandId: string) {
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.PHONE_TO_UAN,
        isActive: true,
        isDisabled: false,
      },
      orderBy: [
        { isPrimary: "desc" }, // Primary first
        { createdAt: "desc" }, // Then newest
      ],
    });

    if (providers.length === 0) {
      throw new HttpException(
        "No active phone to UAN provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Return primary provider if exists, otherwise first active provider
    const primaryProvider = providers.find((p) => p.isPrimary);
    return primaryProvider || providers[0];
  }

  async getExistingUanFromLogs(
    userId: string,
    brandId: string
  ): Promise<{ uan: string } | null> {
    try {
      const existingLog = await this.prisma.phone_to_uan_log.findFirst({
        where: {
          userId,
          brandId,
          status: PhoneToUanStatus.SUCCESS,
          uan: {
            not: null,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          uan: true,
        },
      });

      return existingLog;
    } catch (error) {
      this.logger.error(
        `Failed to fetch existing UAN from logs for user ${userId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Main method to get UAN by phone number
   */
  async getUanByPhone(
    brandId: string,
    request: PhoneToUanRequest,
    userId?: string
  ): Promise<PhoneToUanResponse> {
    const provider = await this.getActivePhoneToUanProvider(brandId);

    this.logger.log(
      `Using ${provider.provider} for phone to UAN lookup (Brand: ${brandId})`
    );

    let response: PhoneToUanResponse;
    let status: PhoneToUanStatus = PhoneToUanStatus.FAILED;

    try {
      switch (provider.provider) {
        case BrandProviderName.SIGNZY:
          response = await this.getUanWithSignzy(request);
          break;
        case BrandProviderName.KYCKART:
          response = await this.getUanWithKycKart(request);
          break;
        default:
          throw new HttpException(
            `Unsupported phone to UAN provider: ${provider.provider}`,
            HttpStatus.NOT_IMPLEMENTED
          );
      }

      // Determine status based on response
      status = response.success
        ? PhoneToUanStatus.SUCCESS
        : PhoneToUanStatus.FAILED;

      // Log the request and response
      await this.logPhoneToUanRequest({
        userId,
        brandId,
        mobileNumber: request.mobileNumber,
        provider: provider.provider,
        status,
        request,
        response,
        uan: response.uan,
        errorMessage: null,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `Phone to UAN failed with ${provider.provider}: ${error.message}`,
        error.stack
      );

      // Log the failed request
      await this.logPhoneToUanRequest({
        userId,
        brandId,
        mobileNumber: request.mobileNumber,
        provider: provider.provider,
        status: PhoneToUanStatus.FAILED,
        request,
        response: null,
        uan: null,
        errorMessage: error.message || "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Log phone to UAN request and response
   */
  private async logPhoneToUanRequest(logData: {
    userId?: string;
    brandId: string;
    mobileNumber: string;
    provider: BrandProviderName;
    status: PhoneToUanStatus;
    request: any;
    response: any;
    uan?: string;
    errorMessage?: string;
  }) {
    try {
      await this.prisma.phone_to_uan_log.create({
        data: {
          userId: logData.userId,
          brandId: logData.brandId,
          mobileNumber: logData.mobileNumber,
          provider: logData.provider,
          status: logData.status,
          request: logData.request,
          response: logData.response || {},
          uan: logData.uan,
          errorMessage: logData.errorMessage,
        },
      });
    } catch (error) {
      // Don't fail the main request if logging fails
      this.logger.error("Failed to log phone to UAN request:", error);
    }
  }

  /**
   * Signzy phone to UAN lookup
   */
  private async getUanWithSignzy(
    request: PhoneToUanRequest
  ): Promise<PhoneToUanResponse> {
    const url = "https://api.signzy.app/api/v3/api/mobile-to-uan";
    const authToken = this.configService.get<string>(
      "SIGNZY_PHONE_TO_UAN_AUTH_TOKEN"
    );

    if (!authToken) {
      throw new HttpException(
        "Signzy phone to UAN configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const mobile = request.mobileNumber.replace(/^\+91/, "");
    const payload: SignzyPhoneToUanRequest = {
      mobileNumber: mobile,
    };

    try {
      this.logger.log(`Making Signzy API call to: ${url}`);
      this.logger.debug(`Signzy request payload:`, payload);

      const { data } = await firstValueFrom(
        this.httpService.post<SignzyPhoneToUanResponse>(url, payload, {
          headers: {
            Authorization: authToken,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        })
      );

      // Log raw response for debugging
      this.logger.debug("Signzy raw response:", JSON.stringify(data, null, 2));

      // Extract UAN safely from either field
      const uan = data.uanNumber || data.result?.uan;
      const isSuccess = Boolean(uan);

      // For backward compatibility, also provide uanList array
      const uanList = uan ? [uan] : [];

      return {
        success: isSuccess,
        uan: uan,
        uanList: uanList, // Add this to match expected interface
        employeeDetails: data.result
          ? {
              name: data.result.name,
              fatherName: data.result.fatherName,
              dateOfBirth: data.result.dateOfBirth,
              joinDate: data.result.joinDate,
              exitDate: data.result.exitDate,
              employerName: data.result.employerName,
              employerAddress: data.result.employerAddress,
            }
          : undefined,
        message: isSuccess ? "UAN lookup successful" : "UAN lookup failed",
        provider: "SIGNZY",
        raw: data,
      };
    } catch (error) {
      this.logger.error("Signzy phone to UAN error:", {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        config: {
          url: error?.config?.url,
          method: error?.config?.method,
          headers: error?.config?.headers
            ? Object.keys(error.config.headers)
            : null,
        },
      });

      // Handle specific Signzy error cases
      if (error?.response?.status === 401) {
        throw new HttpException(
          "Signzy authentication failed - invalid or expired token",
          HttpStatus.UNAUTHORIZED
        );
      } else if (error?.response?.status === 400) {
        throw new HttpException(
          error.response?.data?.message ||
            "Invalid request parameters for Signzy",
          HttpStatus.BAD_REQUEST
        );
      } else if (error?.response?.status === 429) {
        throw new HttpException(
          "Signzy API rate limit exceeded",
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      throw new HttpException(
        error.response?.data?.message || "Signzy phone to UAN lookup failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * KycKart phone to UAN lookup
   */
  private async getUanWithKycKart(
    request: PhoneToUanRequest
  ): Promise<PhoneToUanResponse> {
    const url = "https://api.kyckart.com/api/epfo/getUanV3";
    const apiKey = this.configService.get<string>("KYCKART_API_KEY");

    if (!apiKey) {
      throw new HttpException(
        "KycKart phone to UAN configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    const mobile = request.mobileNumber.replace(/^\+91|^0/, "");

    // Create form data for KycKart API
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("mobileNo", mobile);
    formData.append("checkId", request.checkId || "defaultCheckId");
    formData.append("groupId", request.groupId || "defaultGroupId");
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<KycKartPhoneToUanResponse>(url, formData, {
          headers: {
            "x-api-key": apiKey,
            ...formData.getHeaders(),
          },
        })
      );

      const isSuccess =
        data.status?.statusCode === 200 &&
        data.response?.code === "200" &&
        data.response?.uan_list &&
        data.response.uan_list.length > 0;

      return {
        success: Boolean(isSuccess),
        uan: data.response?.uan_list?.[0], // Return the first UAN from the list
        uanList: data.response?.uan_list, // Return all UANs found
        employeeDetails: {
          // KycKart doesn't return employee details in this API, only UAN list
        },
        message: isSuccess
          ? `Found ${data.response.uan_list.length} UAN(s) for mobile number`
          : "No UANs found for the provided mobile number",
        provider: "KYCKART",
        raw: data,
      };
    } catch (error) {
      this.logger.error("KycKart phone to UAN error:", error.response?.data);
      throw new HttpException(
        error.response?.data?.message || "KycKart phone to UAN lookup failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get UAN with fallback - tries primary provider, then falls back to secondary
   */
  async getUanByPhoneWithFallback(
    brandId: string,
    request: PhoneToUanRequest,
    userId?: string
  ): Promise<PhoneToUanResponse> {
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.PHONE_TO_UAN,
        isActive: true,
        isDisabled: false,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    if (providers.length === 0) {
      throw new HttpException(
        "No active phone to UAN provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    let lastError: any;

    for (const provider of providers) {
      try {
        this.logger.log(
          `Attempting phone to UAN lookup with ${provider.provider} (Primary: ${provider.isPrimary})`
        );

        let response: PhoneToUanResponse;
        let status: PhoneToUanStatus = PhoneToUanStatus.FAILED;

        switch (provider.provider) {
          case BrandProviderName.SIGNZY:
            response = await this.getUanWithSignzy(request);
            break;
          case BrandProviderName.KYCKART:
            response = await this.getUanWithKycKart(request);
            break;
          default:
            this.logger.warn(`Unsupported provider: ${provider.provider}`);
            continue;
        }

        // Determine status based on response
        status = response.success
          ? PhoneToUanStatus.SUCCESS
          : PhoneToUanStatus.FAILED;

        // Log the successful request
        await this.logPhoneToUanRequest({
          userId,
          brandId,
          mobileNumber: request.mobileNumber,
          provider: provider.provider,
          status,
          request,
          response,
          uan: response.uan,
          errorMessage: null,
        });

        return response;
      } catch (error) {
        lastError = error;
        this.logger.error(
          `Provider ${provider.provider} failed, trying next provider...`,
          error.message
        );

        // Log the failed request
        await this.logPhoneToUanRequest({
          userId,
          brandId,
          mobileNumber: request.mobileNumber,
          provider: provider.provider,
          status: PhoneToUanStatus.FAILED,
          request,
          response: null,
          uan: null,
          errorMessage: error.message || "Unknown error",
        });

        continue;
      }
    }

    // If all providers failed
    throw new HttpException(
      lastError?.message || "All phone to UAN providers failed",
      lastError?.status || HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  /**
   * Get phone to UAN logs for a brand
   */
  async getPhoneToUanLogs(
    brandId: string,
    status?: string,
    provider?: string,
    skip: number = 0,
    take: number = 20
  ) {
    const where: any = { brandId };

    if (status) {
      where.status = status;
    }

    if (provider) {
      where.provider = provider;
    }

    const [logs, total] = await Promise.all([
      this.prisma.phone_to_uan_log.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      this.prisma.phone_to_uan_log.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }
}

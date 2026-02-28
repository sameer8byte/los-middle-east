import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { PrismaService } from "src/prisma/prisma.service";
import { firstValueFrom } from "rxjs";
import { BrandProviderType, BrandProviderName } from "@prisma/client";
import {
  PennyDropRequest,
  PennyDropResponse,
  DigitapPennyDropRequest,
  DigitapPennyDropResponse,
  ScoreMePennyDropRequest,
  ScoreMePennyDropResponse,
  SignzyPennyDropRequest,
  SignzyPennyDropResponse,
} from "./interfaces/penny-drop.interface";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PennyDropService {
  private readonly logger = new Logger(PennyDropService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Get the active penny drop provider for a brand
   */
  private async getActivePennyDropProvider(brandId: string) {
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.PENNYDROP,
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
        "No active penny drop provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Return primary provider if exists, otherwise first active provider
    const primaryProvider = providers.find((p) => p.isPrimary);
    return primaryProvider || providers[0];
  }

  /**
   * Main method to perform penny drop verification
   */
  async verifyBankAccount(
    brandId: string,
    request: PennyDropRequest,
    userId: string,
    userBankAccountId?: string
  ): Promise<PennyDropResponse> {
    const provider = await this.getActivePennyDropProvider(brandId);

    this.logger.log(
      `Using ${provider.provider} for penny drop verification (Brand: ${brandId})`
    );

    let response: PennyDropResponse;
    let status: "SUCCESS" | "FAILED" | "PENDING" | "NAME_MISMATCH" = "FAILED";

    try {
      switch (provider.provider) {
        case BrandProviderName.DIGITAP:
          response = await this.verifyWithDigitap(userId, request);
          break;
        case BrandProviderName.SCOREME:
          response = await this.verifyWithScoreMe(userId, request);
          break;
        case BrandProviderName.SIGNZY: // Add Signzy case
          response = await this.verifyWithSignzy(userId, request);
          break;
        default:
          throw new HttpException(
            `Unsupported penny drop provider: ${provider.provider}`,
            HttpStatus.NOT_IMPLEMENTED
          );
      }

      // Determine status based on response
      if (
        response.success
        //  && response.accountExists
      ) {
        status = response.nameMatch === false ? "NAME_MISMATCH" : "SUCCESS";
      } else if (
        response.success
        //  && !response.accountExists
      ) {
        status = "FAILED";
      } else {
        status = "FAILED";
      }

      // Log the request and response
      await this.logPennyDropRequest({
        userBankAccountId,
        userId,
        brandId,
        accountNumber: request.accountNumber,
        ifsc: request.ifsc,
        beneficiaryName: request.beneficiaryName,
        provider: provider.provider,
        status,
        request,
        response,
        // accountExists: response.accountExists,
        accountHolderName: response.accountHolderName,
        nameMatch: response.nameMatch,
        errorMessage: null,
      });

      // Update UserBankAccount if verification is successful and userBankAccountId is provided
      if (response.success && userBankAccountId) {
        await this.updateUserBankAccount(userBankAccountId, response, status);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Penny drop failed with ${provider.provider}: ${error.message}`,
        error.stack
      );

      // Log the failed request
      await this.logPennyDropRequest({
        userBankAccountId,
        userId,
        brandId,
        accountNumber: request.accountNumber,
        ifsc: request.ifsc,
        beneficiaryName: request.beneficiaryName,
        provider: provider.provider,
        status: "FAILED",
        request,
        response: null,
        accountExists: null,
        accountHolderName: null,
        nameMatch: null,
        errorMessage: error.message || "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Log penny drop request and response
   */
  private async logPennyDropRequest(logData: {
    userBankAccountId: string;
    userId: string;
    brandId: string;
    accountNumber: string;
    ifsc: string;
    beneficiaryName?: string;
    provider: BrandProviderName;
    status: "SUCCESS" | "FAILED" | "PENDING" | "NAME_MISMATCH";
    request: any;
    response: any;
    accountExists?: boolean;
    accountHolderName?: string;
    nameMatch?: boolean;
    errorMessage?: string;
  }) {
    try {
      await this.prisma.penny_drop_log.create({
        data: {
          userBankAccountId: logData.userBankAccountId,
          userId: logData.userId,
          brandId: logData.brandId,
          accountNumber: logData.accountNumber,
          ifsc: logData.ifsc,
          beneficiaryName: logData.beneficiaryName,
          provider: logData.provider,
          status: logData.status,
          request: logData.request,
          response: logData.response || {},
          accountExists: logData.accountExists,
          accountHolderName: logData.accountHolderName,
          nameMatch: logData.nameMatch,
          errorMessage: logData.errorMessage,
        },
      });
    } catch (error) {
      // Don't fail the main request if logging fails
      this.logger.error("Failed to log penny drop request:", error);
    }
  }

  /**
   * Update UserBankAccount with penny drop verification results
   */
  private async updateUserBankAccount(
    userBankAccountId: string,
    response: PennyDropResponse,
    status: "SUCCESS" | "FAILED" | "PENDING" | "NAME_MISMATCH"
  ) {
    try {
      const updateData: any = {
        pennyDropResponse: response,
        updatedAt: new Date(),
      };

      // Update verification status based on success
      if (response.success) {
        updateData.verificationStatus = "VERIFIED";
        updateData.verificationMethod = "PENNY_DROP";
        updateData.accountHolderName = response.accountHolderName;
      } else {
        updateData.verificationStatus = "FAILED";
      }

      await this.prisma.userBankAccount.update({
        where: { id: userBankAccountId },
        data: updateData,
      });

      this.logger.log(
        `Updated UserBankAccount ${userBankAccountId} with penny drop results`
      );
    } catch (error) {
      // Don't fail the main request if update fails
      this.logger.error(
        `Failed to update UserBankAccount ${userBankAccountId}:`,
        error
      );
    }
  }

  /**
   * Digitap penny drop verification
   */
  private async verifyWithDigitap(
    userId: string,
    request: PennyDropRequest
  ): Promise<PennyDropResponse> {
    const url =
      this.configService.get<string>("PENNY_DROP_DIGITAP_BASE_URL") +
      "/penny-drop/v2/check-valid";
    const authKey = this.configService.get<string>(
      "PENNY_DROP_DIGITAP_AUTH_KEY"
    );

    if (!authKey) {
      throw new HttpException(
        "Digitap penny drop configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const payload: DigitapPennyDropRequest = {
      ifsc: request.ifsc,
      accNo: request.accountNumber,
      benificiaryName: request.beneficiaryName,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DigitapPennyDropResponse>(url, payload, {
          headers: {
            ent_authorization: authKey,
            "Content-Type": "application/json",
          },
        })
      );

      const isSuccess = data.code === "200" && data.model?.status === "SUCCESS";

      return {
        success: isSuccess,
        nameMatch: data.model?.isNameMatch,
        accountHolderName: data.model?.beneficiaryName,
        message: isSuccess ? "Verification successful" : "Verification failed",
        provider: "DIGITAP",
        raw: data,
      };
    } catch (error) {
      this.logger.error("Digitap penny drop error:", error.response?.data);
      throw new HttpException(
        error.response?.data?.message ||
          "Digitap penny drop verification failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * ScoreMe penny drop verification
   */
  private async verifyWithScoreMe(
    userId: string,
    request: PennyDropRequest
  ): Promise<PennyDropResponse> {
    const url =
      this.configService.get<string>("PENNY_DROP_SCOREME_BASE_URL") +
      "/kyc/external/bankAccountVerification";
    const clientId = this.configService.get<string>(
      "PENNY_DROP_SCOREME_CLIENT_ID"
    );
    const clientSecret = this.configService.get<string>(
      "PENNY_DROP_SCOREME_CLIENT_SECRET"
    );

    if (!clientId || !clientSecret) {
      throw new HttpException(
        "ScoreMe penny drop configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const payload: ScoreMePennyDropRequest = {
      accountNumber: request.accountNumber,
      ifsc: request.ifsc,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ScoreMePennyDropResponse>(url, payload, {
          headers: {
            ClientId: clientId,
            ClientSecret: clientSecret,
            "Content-Type": "application/json",
          },
        })
      );

      const isSuccess = data.responseCode === "SRC001";

      return {
        success: isSuccess,
        accountHolderName: data.data?.name,
        message: data.responseMessage || "Verification completed",
        provider: "SCOREME",
        raw: data,
      };
    } catch (error) {
      this.logger.error("ScoreMe penny drop error:", error.response?.data);
      throw new HttpException(
        error.response?.data?.message ||
          "ScoreMe penny drop verification failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async verifyWithSignzy(
    userId: string,
    request: PennyDropRequest
  ): Promise<PennyDropResponse> {
    const url =
      this.configService.get<string>("PENNY_DROP_SIGNZY_BASE_URL") +
      "/api/v3/bankaccountverifications/advancedverification";
    const authToken = this.configService.get<string>(
      "PENNY_DROP_SIGNZY_AUTH_TOKEN"
    );

    if (!authToken) {
      throw new HttpException(
        "Signzy penny drop configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    if (!userId) {
      throw new HttpException(
        "User ID is required for Signzy penny drop verification",
        HttpStatus.BAD_REQUEST
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      throw new HttpException(
        "Email is required for Signzy penny drop verification",
        HttpStatus.BAD_REQUEST
      );
    }
    const email = user.email;

    const payload: SignzyPennyDropRequest = {
      beneficiaryAccount: request.accountNumber,
      beneficiaryIFSC: request.ifsc,
      beneficiaryMobile: request.beneficiaryMobile,
      nameFuzzy: true,
      beneficiaryName: request.beneficiaryName,
      email: email, // Required for Signzy
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<SignzyPennyDropResponse>(url, payload, {
          headers: {
            Authorization: authToken,
            "Content-Type": "application/json",
          },
        })
      );

      // Check if there's an error in response
      if (data?.error) {
        throw new HttpException(
          data.error.message || "Signzy API error",
          data.error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Validate that result exists
      if (!data?.result) {
        throw new HttpException(
          "Invalid Signzy response: missing result",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      const isSuccess =
        data.result.active === "yes" && data.result.reason === "success";
      const nameMatch = data.result.nameMatch === "yes";
      const accountHolderName = data.result.bankTransfer?.beneName;

      return {
        success: isSuccess,
        nameMatch,
        accountHolderName,
        message: isSuccess ? "Verification successful" : "Verification failed",
        provider: "SIGNZY",
        raw: data,
      };
    } catch (error) {
      this.logger.error("Signzy penny drop error:", error.response?.data);
      throw new HttpException(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Signzy penny drop verification failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify with fallback - tries primary provider, then falls back to secondary
   */
  async verifyBankAccountWithFallback(
    brandId: string,
    request: PennyDropRequest,
    userId: string,
    userBankAccountId?: string
  ): Promise<PennyDropResponse> {
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.PENNYDROP,
        isActive: true,
        isDisabled: false,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    if (providers.length === 0) {
      throw new HttpException(
        "No active penny drop provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    let lastError: any;

    for (const provider of providers) {
      try {
        this.logger.log(
          `Attempting penny drop with ${provider.provider} (Primary: ${provider.isPrimary})`
        );

        let response: PennyDropResponse;
        let status: "SUCCESS" | "FAILED" | "PENDING" | "NAME_MISMATCH" =
          "FAILED";

        switch (provider.provider) {
          case BrandProviderName.DIGITAP:
            response = await this.verifyWithDigitap(userId, request);
            break;
          case BrandProviderName.SCOREME:
            response = await this.verifyWithScoreMe(userId, request);
            break;
          case BrandProviderName.SIGNZY:
            response = await this.verifyWithSignzy(userId, request);
            break;
          default:
            this.logger.warn(`Unsupported provider: ${provider.provider}`);
            continue;
        }

        // Determine status based on response
        if (
          response.success
          // && response.accountExists
        ) {
          status = response.nameMatch === false ? "NAME_MISMATCH" : "SUCCESS";
        }
        // else if (response.success && !response.accountExists) {
        //   status = 'FAILED';
        // }
        else {
          status = "FAILED";
        }

        // Log the successful request
        await this.logPennyDropRequest({
          userBankAccountId,
          userId,
          brandId,
          accountNumber: request.accountNumber,
          ifsc: request.ifsc,
          beneficiaryName: request.beneficiaryName,
          provider: provider.provider,
          status,
          request,
          response,
          // accountExists: response.accountExists,
          accountHolderName: response.accountHolderName,
          nameMatch: response.nameMatch,
          errorMessage: null,
        });

        // Update UserBankAccount if verification is successful and userBankAccountId is provided
        if (response.success && userBankAccountId) {
          await this.updateUserBankAccount(userBankAccountId, response, status);
        }

        return response;
      } catch (error) {
        lastError = error;
        this.logger.error(
          `Provider ${provider.provider} failed, trying next provider...`,
          error.message
        );

        // Log the failed request
        await this.logPennyDropRequest({
          userBankAccountId,
          userId,
          brandId,
          accountNumber: request.accountNumber,
          ifsc: request.ifsc,
          beneficiaryName: request.beneficiaryName,
          provider: provider.provider,
          status: "FAILED",
          request,
          response: null,
          accountExists: null,
          accountHolderName: null,
          nameMatch: null,
          errorMessage: error.message || "Unknown error",
        });

        continue;
      }
    }

    // If all providers failed
    throw new HttpException(
      lastError?.message || "All penny drop providers failed",
      lastError?.status || HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  /**
   * Get penny drop logs for a brand
   */
  async getPennyDropLogs(
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
      this.prisma.penny_drop_log.findMany({
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
      this.prisma.penny_drop_log.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }
}

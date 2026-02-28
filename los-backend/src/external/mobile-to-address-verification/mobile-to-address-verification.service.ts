import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { randomUUID } from "crypto";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandProviderName, AddressProofEnum, BrandProviderType } from "@prisma/client";
import {
  MobileVerificationUnifiedResponse,
  ExtractedAddress,
  MobileServiceType,
  MobileVerificationBatchResponse,
} from "./interface/mobile-to-address-verification-response.interface";

@Injectable()
export class MobileToAddressVerificationService {
  private readonly logger = new Logger(MobileToAddressVerificationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Get the active mobile verification provider for a brand and service type
   */
  private async getActiveMobileVerificationProvider(
    brandId: string,
    serviceType: MobileServiceType
  ) {
    const providerType = this.mapServiceTypeToProviderType(serviceType);
    
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: providerType,
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
        `No active ${serviceType} provider configured for this brand`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Return primary provider if exists, otherwise first active provider
    const primaryProvider = providers.find((p) => p.isPrimary);
    return primaryProvider || providers[0];
  }

  /**
   * Map service type to provider type
   */
  private mapServiceTypeToProviderType(serviceType: MobileServiceType): BrandProviderType {
    switch (serviceType) {
      case "MOBILE_TO_ADDRESSES":
        return BrandProviderType.MOBILE_TO_ADDRESS;
      case "MOBILE_TO_ADDRESSES_ECOM":
        return BrandProviderType.MOBILE_TO_ECOM_ADDRESS;
      case "MOBILE_TO_LPG_DETAILS":
        return BrandProviderType.MOBILE_TO_LPG_ADDRESS;
      case "MOBILE_TO_DL_ADVANCED":
        return BrandProviderType.MOBILE_TO_DL_ADDRESS;
      default:
        return BrandProviderType.MOBILE_TO_ADDRESS;
    }
  }

  /**
   * Make KycKart API request with timeout
   */
  private async makeKycKartRequest(
    url: string, 
    formData: URLSearchParams, 
    headers: any,
    timeoutMs: number = 30000 // Default 30 seconds
  ) {
    try {
      const startTime = Date.now();
      const { data } = await firstValueFrom(
        this.httpService.post(url, formData.toString(), { 
          headers,
          timeout: timeoutMs 
        })
      );
      const duration = Date.now() - startTime;
      return { data, duration };
    } catch (error) {
      throw error;
    }
  }

  private getKycKartConfig() {
    const baseUrl = this.configService.get<string>('KYCCARTBASE_URL');
    const apiKey = this.configService.get<string>('KYCCART_API_KEY');
    
    if (!baseUrl || !apiKey) {
      throw new Error('KycKart configuration is missing. Please check KYCCARTBASE_URL and KYCCART_API_KEY environment variables.');
    }

    return { baseUrl, apiKey };
  }

  /**
   * Get user phone number from database
   */
  private async getUserPhoneNumber(
    userId: string,
    brandId: string
  ): Promise<string> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          brandId: brandId,
        },
        select: {
          phoneNumber: true,
        },
      });

      if (!user) {
        throw new HttpException(
          `User not found`,
          HttpStatus.NOT_FOUND
        );
      }

      if (!user.phoneNumber) {
        throw new HttpException(
          `Phone number not found for user`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Sanitize the phone number
      const sanitizedPhoneNumber = this.sanitizePhoneNumber(user.phoneNumber);
      
      if (!sanitizedPhoneNumber) {
        throw new HttpException(
          `Invalid phone number format`,
          HttpStatus.BAD_REQUEST
        );
      }

      return sanitizedPhoneNumber;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to fetch user phone number for user ${userId}:`, error);
      throw new HttpException(
        `Failed to fetch user phone number`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Sanitize phone number to 10-digit format
   */
  private sanitizePhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) return null;

    try {
      let cleaned = phoneNumber.trim();
      cleaned = cleaned.replace(/\s+|-|\(|\)/g, '');
      
      if (cleaned.startsWith('+91')) {
        cleaned = cleaned.substring(3);
      }
      else if (cleaned.startsWith('91') && cleaned.length > 10) {
        cleaned = cleaned.substring(2);
      }
      else if (cleaned.startsWith('0') && cleaned.length > 10) {
        cleaned = cleaned.substring(1);
      }
      
      cleaned = cleaned.replace(/\D/g, '');
      
      if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
        return cleaned;
      }
      
      
      return null;
    } catch (error) {
      this.logger.error(`Error sanitizing phone number ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Check if data exists in alternate address for this user and service type
   */
  private async checkExistingDataInAlternateAddress(
    userId: string,
    serviceType: MobileServiceType
  ): Promise<boolean> {
    try {
      const addressProofType =
        this.mapServiceTypeToAddressProofType(serviceType);

      const existingAddresses = await this.prisma.alternateAddress.findMany({
        where: {
          userId: userId,
          addressProofType: addressProofType,
        },
        take: 1,
      });

      return existingAddresses.length > 0;
    } catch (error) {
      this.logger.error(
        `Error checking existing addresses for user ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Check if there are previous "no data found" errors in logs for this user and service type
   */
  private async checkPreviousNoDataErrors(
    userId: string,
    serviceType: MobileServiceType
  ): Promise<boolean> {
    try {
      // Look for recent logs (last 30 days) with "no data" type errors
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const errorLogs = await this.prisma.mobile_verification_logs.findMany({
        where: {
          userId: userId,
          serviceType: serviceType,
          createdAt: {
            gte: thirtyDaysAgo,
          },
          OR: [
            { errorMessage: { contains: "No registered addresses found" } },
            { errorMessage: { contains: "No e-commerce addresses found" } },
            { errorMessage: { contains: "No LPG connection details found" } },
            { errorMessage: { contains: "No driving license details found" } },
            { errorMessage: { contains: "No addresses found" } },
            { errorMessage: { contains: "not found" } },
            { errorMessage: { contains: "Access Denied" } },
            { errorMessage: { contains: "required privilege" } },
            { errorMessage: { contains: "timed out" } },
            { errorMessage: { contains: "timeout" } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      return errorLogs.length > 0;
    } catch (error) {
      this.logger.error(
        `Error checking previous error logs for user ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get cached error response from previous logs
   */
  private async getCachedErrorResponse(
    userId: string,
    serviceType: MobileServiceType
  ): Promise<MobileVerificationUnifiedResponse> {
    try {
      // Get the most recent error log for this service type
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const errorLog = await this.prisma.mobile_verification_logs.findFirst({
        where: {
          userId: userId,
          serviceType: serviceType,
          createdAt: {
            gte: thirtyDaysAgo,
          },
          OR: [
            { errorMessage: { contains: "No registered addresses found" } },
            { errorMessage: { contains: "No e-commerce addresses found" } },
            { errorMessage: { contains: "No LPG connection details found" } },
            { errorMessage: { contains: "No driving license details found" } },
            { errorMessage: { contains: "No addresses found" } },
            { errorMessage: { contains: "Access Denied" } },
            { errorMessage: { contains: "required privilege" } },
            { errorMessage: { contains: "timed out" } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!errorLog) {
        throw new Error("No cached error found");
      }

      const userFriendlyMessage = this.getErrorMessage(serviceType);

      return {
        success: false,
        data: null,
        message: userFriendlyMessage,
        provider: BrandProviderName.KYCKART,
        raw: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving cached error response for user ${userId}:`,
        error
      );
      throw new HttpException(
        "Failed to retrieve cached error response",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get existing data from alternate address table
   */
  private async getExistingDataFromAlternateAddress(
    userId: string,
    serviceType: MobileServiceType
  ): Promise<MobileVerificationUnifiedResponse> {
    try {
      const addressProofType =
        this.mapServiceTypeToAddressProofType(serviceType);

      const existingAddresses = await this.prisma.alternateAddress.findMany({
        where: {
          userId: userId,
          addressProofType: addressProofType,
        },
      });

      const addresses = existingAddresses.map((addr) => ({
        address: addr.address,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country,
        category: this.getCategoryFromAddressProofType(addressProofType),
      }));

      return {
        success: true,
        data: {
          addresses: addresses,
          fromCache: true,
        },
        message: "Data retrieved from existing records",
        provider: BrandProviderName.KYCKART,
        raw: null,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving existing addresses for user ${userId}:`,
        error
      );
      throw new HttpException(
        "Failed to retrieve existing data",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Helper to get category from address proof type
   */
  private getCategoryFromAddressProofType(
    addressProofType: AddressProofEnum
  ): string {
    switch (addressProofType) {
      case AddressProofEnum.MOBILE_TO_ADDRESS:
        return "Mobile Address";
      case AddressProofEnum.MOBILE_TO_ECOM_ADDRESS:
        return "Ecom";
      case AddressProofEnum.MOBILE_TO_LPG_ADDRESS:
        return "LPG";
      case AddressProofEnum.MOBILE_TO_DL_ADDRESS:
        return "DL";
      default:
        return "Unknown";
    }
  }

  /**
   * Get user-friendly error message for different service types
   */
  private getErrorMessage(serviceType: MobileServiceType, apiMessage?: string): string {
    const defaultMessages = {
      "MOBILE_TO_ADDRESSES": "No registered addresses found for this mobile number",
      "MOBILE_TO_ADDRESSES_ECOM": "E-commerce address verification is currently unavailable",
      "MOBILE_TO_LPG_DETAILS": "No LPG connection details found for this mobile number", 
      "MOBILE_TO_DL_ADVANCED": "Driving license verification service is currently unavailable"
    };

    // Handle specific API errors
    if (apiMessage?.includes("Access Denied") || apiMessage?.includes("required privilege")) {
      return "Service temporarily unavailable. Please try another verification method.";
    }
    
    if (apiMessage?.includes("timed out") || apiMessage?.includes("timeout")) {
      return "Verification service is taking longer than expected. Please try again.";
    }

    if (apiMessage?.includes("Endpoint request timed out")) {
      return "Service timeout. Please try again later.";
    }

    // If API provides a meaningful message, use it
    if (apiMessage && !apiMessage.includes("api-key") && !apiMessage.includes("key")) {
      return apiMessage;
    }

    return defaultMessages[serviceType] || "Address verification failed";
  }

  /**
   * Log request
   */
  private logRequest(
    provider: BrandProviderName,
    serviceType: MobileServiceType,
    mobileNo: string,
    userId: string,
    brandId: string,
    fromCache: boolean = false
  ) {
    const source = fromCache ? "CACHE" : "API";
    this.logger.log(
      `[${provider}] Starting ${serviceType} | Mobile: ${mobileNo?.substring(0, 3)}XXX${mobileNo?.substring(6)} | User: ${userId} | Source: ${source}`
    );
  }

  /**
   * Log cache hit
   */
  private logCacheHit(
    provider: BrandProviderName,
    serviceType: MobileServiceType,
    mobileNo: string,
    userId: string,
    cacheType: 'DATA' | 'ERROR' = 'DATA'
  ) {
    const cacheSource = cacheType === 'DATA' ? 'DATA_CACHE' : 'ERROR_CACHE';
    this.logger.log(
      `[${provider}] ${serviceType} ${cacheSource} HIT | Mobile: ${mobileNo?.substring(0, 3)}XXX${mobileNo?.substring(6)} | User: ${userId}`
    );
  }

  /**
   * Log success
   */
  private logSuccess(
    provider: BrandProviderName,
    serviceType: MobileServiceType,
    mobileNo: string,
    response: any,
    userId: string,
    brandId: string,
    fromCache: boolean = false
  ) {
    const source = fromCache ? "CACHE" : "API";
    const statusCode = response?.status?.statusCode || response?.code;
    const addressesCount = response?.response?.addresses?.length || response?.response?.length || 0;
    
    this.logger.log(
      `[${provider}] ${serviceType} SUCCESS | Mobile: ${mobileNo?.substring(0, 3)}XXX${mobileNo?.substring(6)} | Status: ${statusCode} | Addresses: ${addressesCount} | Source: ${source}`
    );
  }

  /**
   * Log error - Enhanced to avoid credential leakage
   */
  private logError(
    provider: BrandProviderName,
    serviceType: MobileServiceType,
    mobileNo: string,
    error: any,
    userId?: string
  ) {
    // Sanitize error message to avoid credential leakage
    let errorMessage = error?.message || "Unknown error";
    const statusCode = error?.response?.status || error?.status || 500;

    // Remove any sensitive information from error messages
    errorMessage = errorMessage
      .replace(/api-?key=[^&\s]+/gi, 'api-key=***')
      .replace(/key=[^&\s]+/gi, 'key=***')
      .replace(/password=[^&\s]+/gi, 'password=***')
      .replace(/secret=[^&\s]+/gi, 'secret=***');

    this.logger.error(
      `[${provider}] ${serviceType} FAILED | Mobile: ${mobileNo?.substring(0, 3)}XXX${mobileNo?.substring(6)} | User: ${userId} | Status: ${statusCode} | Error: ${errorMessage}`
    );

    // Log debug info without sensitive data
    if (error?.response?.data) {
      const sanitizedData = this.sanitizeSensitiveData(error.response.data);
      this.logger.debug(
        `[${provider}] Error details: ${JSON.stringify(sanitizedData)}`
      );
    }
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeSensitiveData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['apiKey', 'api-key', 'key', 'password', 'secret', 'token', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    // Sanitize nested objects
    if (sanitized.headers) {
      const sensitiveHeaders = ['authorization', 'api-key', 'x-api-key'];
      sensitiveHeaders.forEach(header => {
        if (sanitized.headers[header]) {
          sanitized.headers[header] = '***';
        }
      });
    }

    return sanitized;
  }

  /**
   * Log mobile verification request to DB
   */
 private async logMobileVerificationRequest(logData: {
  userId?: string;
  brandId?: string;
  mobileNo: string;
  provider: BrandProviderName;
  serviceType: MobileServiceType;
  status: "SUCCESS" | "FAILED" | "INVALID" | "PENDING";
  request: any;
  response: any;
  isValid?: boolean;
  errorMessage?: string;
  fromCache?: boolean;
}) {
  try {
    // Sanitize request and response data before logging
    const sanitizedRequest = this.sanitizeSensitiveData(logData.request);
    const sanitizedResponse = this.sanitizeSensitiveData(logData.response);

    const now = new Date();

    // Prepare the data object with proper typing
    const createData: any = {
      id: randomUUID(),
      provider: logData.provider,
      serviceType: logData.serviceType,
      request: sanitizedRequest,
      response: sanitizedResponse || {},
      isValid: logData.isValid ?? null,
      errorMessage: logData.errorMessage ?? null,
      createdAt: now, // Add this
      updatedAt: now, // Add this
    };

    // Only include userId and brandId if they are provided and not empty
    if (logData.userId?.trim()) {
      createData.userId = logData.userId;
    }

    if (logData.brandId?.trim()) {
      createData.brandId = logData.brandId;
    }

    await this.prisma.mobile_verification_logs.create({
      data: createData,
    });
  } catch (error) {
    this.logger.error("Failed to log mobile verification request:", error);
  }
}

  /**
   * Extract address components from various response formats
   */
  private extractAddressComponents(addressData: any): ExtractedAddress {
    if (!addressData) {
      return {
        fullAddress: null,
        city: null,
        state: null,
        pincode: null,
        country: null,
      };
    }

    if (typeof addressData === "string") {
      const fullAddress = addressData.trim();
      const pincodeMatch = fullAddress.match(/\b(\d{6})\b/);
      const pincode = pincodeMatch ? pincodeMatch[1] : null;

      let state: string | null = null;
      const stateKeywords = [
        "Uttar Pradesh",
        "Gujarat",
        "Maharashtra",
        "Rajasthan",
        "Karnataka",
      ];
      for (const keyword of stateKeywords) {
        if (fullAddress.includes(keyword)) {
          state = keyword;
          break;
        }
      }

      return {
        fullAddress,
        city: null,
        state,
        pincode,
        country: "India",
      };
    }

    if (addressData.line1 && addressData.city) {
      const parts: string[] = [];
      if (addressData.line1) parts.push(addressData.line1);
      if (addressData.line2) parts.push(addressData.line2);
      if (addressData.city) parts.push(addressData.city);
      if (addressData.state) parts.push(addressData.state);
      if (addressData.pincode) parts.push(addressData.pincode);

      return {
        fullAddress: parts.filter(Boolean).join(", "),
        city: addressData.city || null,
        state: addressData.state || null,
        pincode: addressData.pincode || null,
        country: addressData.country || "India",
      };
    }

    if (addressData.completeAddress) {
      return {
        fullAddress: addressData.completeAddress,
        city: null,
        state: addressData.state || null,
        pincode: addressData.pin || null,
        country: addressData.country || "India",
      };
    }

    return {
      fullAddress: null,
      city: null,
      state: null,
      pincode: null,
      country: null,
    };
  }

  /**
   * Store addresses in AlternateAddress table
   */
  private async storeAlternateAddresses(
    userId: string,
    serviceType: MobileServiceType,
    addresses: ExtractedAddress[]
  ) {
    if (!userId || addresses.length === 0) {
      return;
    }

    try {
      const addressProofType =
        this.mapServiceTypeToAddressProofType(serviceType);

      for (const address of addresses) {
        if (!address.fullAddress) continue;

        const addressData: any = {
          userId,
          address: address.fullAddress,
          city: address.city || "",
          state: address.state || "",
          pincode: address.pincode || "",
          country: address.country || "India",
          addressProofType: addressProofType,
        };

        const existingAddress = await this.prisma.alternateAddress.findFirst({
          where: {
            userId: userId,
            address: address.fullAddress,
            addressProofType: addressProofType,
          },
        });

        if (existingAddress) {
          await this.prisma.alternateAddress.update({
            where: {
              id: existingAddress.id,
            },
            data: addressData,
          });
        } else {
          await this.prisma.alternateAddress.create({
            data: addressData,
          });
        }
      }

      this.logger.log(
        `Stored ${addresses.length} addresses for user ${userId} with type ${addressProofType}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store alternate addresses for user ${userId}:`,
        error
      );
    }
  }

  /**
   * Map service type to address proof type
   */
  private mapServiceTypeToAddressProofType(
    serviceType: MobileServiceType
  ): AddressProofEnum {
    switch (serviceType) {
      case "MOBILE_TO_ADDRESSES":
        return AddressProofEnum.MOBILE_TO_ADDRESS;
      case "MOBILE_TO_ADDRESSES_ECOM":
        return AddressProofEnum.MOBILE_TO_ECOM_ADDRESS;
      case "MOBILE_TO_LPG_DETAILS":
        return AddressProofEnum.MOBILE_TO_LPG_ADDRESS;
      case "MOBILE_TO_DL_ADVANCED":
        return AddressProofEnum.MOBILE_TO_DL_ADDRESS;
      default:
        return AddressProofEnum.MOBILE_TO_ADDRESS;
    }
  }

  /**
 * Enhanced error handler for API responses
 */
private handleApiErrorResponse(
  serviceType: MobileServiceType,
  data: any,
  provider: BrandProviderName,
  mobileNo: string,
  userId: string
): never {
  const statusCode = data?.status?.statusCode;
  const apiMessage = data?.status?.statusMessage;
  
  // Check if this is actually a successful API response with no data
  const isHttpSuccess = statusCode === 200;
  
  if (isHttpSuccess) {
    // This is a successful API call but with no data - not an error
    const userFriendlyMessage = this.getErrorMessage(serviceType, apiMessage);


    throw new HttpException(
      {
        message: userFriendlyMessage,
        provider,
        code: statusCode,
        serviceType,
        success: false,
        data: data?.response || null,
      },
      HttpStatus.OK // Return 200 instead of 400 for "no data found"
    );
  }
  
  // Actual API error (non-200 status)
  const userFriendlyMessage = this.getErrorMessage(serviceType, apiMessage);
  

  throw new HttpException(
    {
      message: userFriendlyMessage,
      provider,
      code: statusCode,
      serviceType,
      success: false,
      data: data?.response || null,
    },
    HttpStatus.BAD_REQUEST
  );
}

  /**
   * Enhanced cache check that includes both data cache and error cache
   */
  private async checkCache(
    userId: string,
    serviceType: MobileServiceType,
    brandId: string
  ): Promise<MobileVerificationUnifiedResponse | null> {
    // First check if we have data in alternate address
    const hasExistingData = await this.checkExistingDataInAlternateAddress(userId, serviceType);
    
    if (hasExistingData) {
      const mobileNo = await this.getUserPhoneNumber(userId, brandId);
      this.logCacheHit(BrandProviderName.KYCKART, serviceType, mobileNo, userId, 'DATA');
      return this.getExistingDataFromAlternateAddress(userId, serviceType);
    }

    // If no data in alternate address, check if we have previous "no data" errors in logs
    const hasPreviousErrors = await this.checkPreviousNoDataErrors(userId, serviceType);
    
    if (hasPreviousErrors) {
      const mobileNo = await this.getUserPhoneNumber(userId, brandId);
      this.logCacheHit(BrandProviderName.KYCKART, serviceType, mobileNo, userId, 'ERROR');
      return this.getCachedErrorResponse(userId, serviceType);
    }

    return null;
  }

  /**
   * Verify mobile with KycKart - Mobile to Addresses (with enhanced cache logic)
   */
  async verifyMobileToAddressesWithKycKart(
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string
  ): Promise<MobileVerificationUnifiedResponse> {
    // Check if provider is configured
    await this.getActiveMobileVerificationProvider(brandId, "MOBILE_TO_ADDRESSES");

    // Enhanced cache check (both data and error cache)
    const cachedResult = await this.checkCache(userId, "MOBILE_TO_ADDRESSES", brandId);
    if (cachedResult) {
      return cachedResult;
    }

    // Get phone number from user table
    const mobileNo = await this.getUserPhoneNumber(userId, brandId);

    const serviceType: MobileServiceType = "MOBILE_TO_ADDRESSES";
    const provider = BrandProviderName.KYCKART;
    const { baseUrl, apiKey } = this.getKycKartConfig();
    const url = `${baseUrl}/api/mobileVerification/mobileToAddresses`;

    this.logRequest(provider, serviceType, mobileNo, userId, brandId);

    const requestPayload = {
      mobileNo,
      ...(checkId && { checkId }),
      ...(groupId && { groupId }),
    };

    try {
      const formData = new URLSearchParams();
      formData.append("mobileNo", mobileNo);
      if (checkId) formData.append("checkId", checkId);
      if (groupId) formData.append("groupId", groupId);

      const headers = {
        "x-api-key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      const { data, duration } = await this.makeKycKartRequest(url, formData, headers, 30000);


      // Handle business logic errors (API success but no data or error status)
      const isHttpSuccess = data?.status?.statusCode === 200;
      const hasAddresses = data?.response?.addresses?.length > 0;
      
      if (!isHttpSuccess || !hasAddresses) {
        this.handleApiErrorResponse(serviceType, data, provider, mobileNo, userId);
      }

      this.logSuccess(provider, serviceType, mobileNo, data, userId, brandId);

      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "SUCCESS",
        request: requestPayload,
        response: data,
        isValid: true,
        errorMessage: null,
      });

      // Extract and store addresses
      if (userId && data?.response?.addresses) {
        const addresses: ExtractedAddress[] = data.response.addresses.map(
          (addr: any) => ({
            ...this.extractAddressComponents(addr.address),
            category: addr.category,
            lastSeenDate: addr.lastSeenDate,
          })
        );

        await this.storeAlternateAddresses(userId, serviceType, addresses);
      }

      return {
        success: true,
        data: data?.response || null,
        message: "Address verification successful",
        provider,
        raw: data,
      };
    } catch (error) {
      this.logError(provider, serviceType, mobileNo, error, userId);

      // If it's already a formatted HttpException, re-throw it
      if (error instanceof HttpException) {
        await this.logMobileVerificationRequest({
          userId,
          brandId,
          mobileNo,
          provider,
          serviceType,
          status: "FAILED",
          request: requestPayload,
          response: error.getResponse(),
          isValid: false,
          errorMessage: error.message,
        });
        throw error;
      }

      // Handle network/technical errors
      const userFriendlyMessage = this.getErrorMessage(serviceType);
      
      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "FAILED",
        request: requestPayload,
        response: error?.response?.data || null,
        isValid: false,
        errorMessage: userFriendlyMessage,
      });

      throw new HttpException(
        {
          message: userFriendlyMessage,
          provider,
          serviceType,
          success: false,
          code: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        },
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify mobile with KycKart - Mobile to Ecommerce Addresses (with enhanced cache logic)
   */
  async verifyMobileToAddressesEcomWithKycKart(
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string
  ): Promise<MobileVerificationUnifiedResponse> {
    // Check if provider is configured
    await this.getActiveMobileVerificationProvider(brandId, "MOBILE_TO_ADDRESSES_ECOM");

    // Enhanced cache check (both data and error cache)
    const cachedResult = await this.checkCache(userId, "MOBILE_TO_ADDRESSES_ECOM", brandId);
    if (cachedResult) {
      return cachedResult;
    }

    // Get phone number from user table
    const mobileNo = await this.getUserPhoneNumber(userId, brandId);

    const serviceType: MobileServiceType = "MOBILE_TO_ADDRESSES_ECOM";
    const provider = BrandProviderName.KYCKART;
    const { baseUrl, apiKey } = this.getKycKartConfig();
    const url = `${baseUrl}/api/mobileVerification/mobileToAddressesEcommerceV3`;

    this.logRequest(provider, serviceType, mobileNo, userId, brandId);

    const requestPayload = {
      mobileNo,
      ...(checkId && { checkId }),
      ...(groupId && { groupId }),
    };

    try {
      const formData = new URLSearchParams();
      formData.append("mobileNo", mobileNo);
      if (checkId) formData.append("checkId", checkId);
      if (groupId) formData.append("groupId", groupId);

      const headers = {
        "x-api-key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      const { data, duration } = await this.makeKycKartRequest(url, formData, headers, 30000);

      // Handle business logic errors
      const isHttpSuccess = data?.status?.statusCode === 200;
      const hasAddresses = data?.response?.addresses?.length > 0;
      
      if (!isHttpSuccess || !hasAddresses) {
        this.handleApiErrorResponse(serviceType, data, provider, mobileNo, userId);
      }

      this.logSuccess(provider, serviceType, mobileNo, data, userId, brandId);

      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "SUCCESS",
        request: requestPayload,
        response: data,
        isValid: true,
        errorMessage: null,
      });

      // Extract and store addresses
      if (userId && data?.response?.addresses) {
        const addresses: ExtractedAddress[] = data.response.addresses.map(
          (addr: any) => ({
            ...this.extractAddressComponents(addr),
            category: "Ecom",
            lastSeenDate: addr.lastSeenDate,
          })
        );

        await this.storeAlternateAddresses(userId, serviceType, addresses);
      }

      return {
        success: true,
        data: data?.response || null,
        message: "E-commerce address verification successful",
        provider,
        raw: data,
      };
    } catch (error) {
      this.logError(provider, serviceType, mobileNo, error, userId);

      // Handle access denied specifically
      if (error?.response?.data?.error?.message?.includes("required privilege") || 
          error?.response?.data?.error?.message?.includes("Access Denied")) {
        
        const accessDeniedMessage = "E-commerce address verification is currently unavailable";
        
        await this.logMobileVerificationRequest({
          userId,
          brandId,
          mobileNo,
          provider,
          serviceType,
          status: "FAILED",
          request: requestPayload,
          response: error?.response?.data || null,
          isValid: false,
          errorMessage: accessDeniedMessage,
        });

        throw new HttpException(
          {
            message: accessDeniedMessage,
            provider,
            serviceType,
            success: false,
            code: 403,
          },
          HttpStatus.FORBIDDEN
        );
      }

      if (error instanceof HttpException) {
        await this.logMobileVerificationRequest({
          userId,
          brandId,
          mobileNo,
          provider,
          serviceType,
          status: "FAILED",
          request: requestPayload,
          response: error.getResponse(),
          isValid: false,
          errorMessage: error.message,
        });
        throw error;
      }

      const userFriendlyMessage = this.getErrorMessage(serviceType);
      
      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "FAILED",
        request: requestPayload,
        response: error?.response?.data || null,
        isValid: false,
        errorMessage: userFriendlyMessage,
      });

      throw new HttpException(
        {
          message: userFriendlyMessage,
          provider,
          serviceType,
          success: false,
          code: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        },
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify mobile with KycKart - Mobile to LPG Details (with enhanced cache logic)
   */
  async verifyMobileToLpgDetailsWithKycKart(
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string
  ): Promise<MobileVerificationUnifiedResponse> {
    // Check if provider is configured
    await this.getActiveMobileVerificationProvider(brandId, "MOBILE_TO_LPG_DETAILS");

    // Enhanced cache check (both data and error cache)
    const cachedResult = await this.checkCache(userId, "MOBILE_TO_LPG_DETAILS", brandId);
    if (cachedResult) {
      return cachedResult;
    }

    // Get phone number from user table
    const mobileNo = await this.getUserPhoneNumber(userId, brandId);

    const serviceType: MobileServiceType = "MOBILE_TO_LPG_DETAILS";
    const provider = BrandProviderName.KYCKART;
    const { baseUrl, apiKey } = this.getKycKartConfig();
    const url = `${baseUrl}/api/lpgBill/searchV3`;

    this.logRequest(provider, serviceType, mobileNo, userId, brandId);

    const requestPayload = {
      mobileNo,
      ...(checkId && { checkId }),
      ...(groupId && { groupId }),
    };

    try {
      const formData = new URLSearchParams();
      formData.append("mobileNo", mobileNo);
      if (checkId) formData.append("checkId", checkId);
      if (groupId) formData.append("groupId", groupId);

      const headers = {
        "x-api-key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      const { data, duration } = await this.makeKycKartRequest(url, formData, headers, 30000);


      // Handle business logic errors
      const isHttpSuccess = data?.status?.statusCode === 200;
      const hasLpgDetails = data?.response?.length > 0;
      
      if (!isHttpSuccess || !hasLpgDetails) {
        this.handleApiErrorResponse(serviceType, data, provider, mobileNo, userId);
      }

      this.logSuccess(provider, serviceType, mobileNo, data, userId, brandId);

      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "SUCCESS",
        request: requestPayload,
        response: data,
        isValid: true,
        errorMessage: null,
      });

      // Extract and store addresses
      if (userId && data?.response) {
        const addresses: ExtractedAddress[] = data.response.map((lpg: any) => ({
          ...this.extractAddressComponents(lpg.address),
          category: `LPG - ${lpg.provider}`,
        }));

        await this.storeAlternateAddresses(userId, serviceType, addresses);
      }

      return {
        success: true,
        data: data?.response || null,
        message: "LPG details verification successful",
        provider,
        raw: data,
      };
    } catch (error) {
      this.logError(provider, serviceType, mobileNo, error, userId);

      if (error instanceof HttpException) {
        await this.logMobileVerificationRequest({
          userId,
          brandId,
          mobileNo,
          provider,
          serviceType,
          status: "FAILED",
          request: requestPayload,
          response: error.getResponse(),
          isValid: false,
          errorMessage: error.message,
        });
        throw error;
      }

      const userFriendlyMessage = this.getErrorMessage(serviceType);
      
      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "FAILED",
        request: requestPayload,
        response: error?.response?.data || null,
        isValid: false,
        errorMessage: userFriendlyMessage,
      });

      throw new HttpException(
        {
          message: userFriendlyMessage,
          provider,
          serviceType,
          success: false,
          code: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        },
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify mobile with KycKart - Mobile to DL Advanced (with enhanced cache logic)
   */
  async verifyMobileToDLAdvancedWithKycKart(
    userId: string,
    brandId: string,
    checkId?: string
  ): Promise<MobileVerificationUnifiedResponse> {
    // Check if provider is configured
    await this.getActiveMobileVerificationProvider(brandId, "MOBILE_TO_DL_ADVANCED");

    // Enhanced cache check (both data and error cache)
    const cachedResult = await this.checkCache(userId, "MOBILE_TO_DL_ADVANCED", brandId);
    if (cachedResult) {
      return cachedResult;
    }

    // Get phone number from user table
    const mobileNo = await this.getUserPhoneNumber(userId, brandId);

    const serviceType: MobileServiceType = "MOBILE_TO_DL_ADVANCED";
    const provider = BrandProviderName.KYCKART;
    const { baseUrl, apiKey } = this.getKycKartConfig();
    const url = `${baseUrl}/api/mobileVerification/mobileToDLAdvanced`;

    this.logRequest(provider, serviceType, mobileNo, userId, brandId);

    const requestPayload = {
      mobileNo,
      ...(checkId && { checkId }),
    };

    try {
      const formData = new URLSearchParams();
      formData.append("mobileNo", mobileNo);
      if (checkId) formData.append("checkId", checkId);

      const headers = {
        "x-api-key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      // Increased timeout for DL verification to 60 seconds
      const { data, duration } = await this.makeKycKartRequest(url, formData, headers, 60000);

      // Handle business logic errors
      const isHttpSuccess = data?.status?.statusCode === 200;
      const hasDlDetails = data?.response?.user_address?.length > 0;
      
      if (!isHttpSuccess || !hasDlDetails) {
        this.handleApiErrorResponse(serviceType, data, provider, mobileNo, userId);
      }

      this.logSuccess(provider, serviceType, mobileNo, data, userId, brandId);

      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "SUCCESS",
        request: requestPayload,
        response: data,
        isValid: true,
        errorMessage: null,
      });

      // Extract and store addresses
      if (userId && data?.response?.user_address) {
        const addresses: ExtractedAddress[] = data.response.user_address.map(
          (addr: any) => ({
            ...this.extractAddressComponents(addr),
            category: `DL - ${addr.type}`,
          })
        );

        await this.storeAlternateAddresses(userId, serviceType, addresses);
      }

      return {
        success: true,
        data: data?.response || null,
        message: "Driving license verification successful",
        provider,
        raw: data,
      };
    } catch (error) {
      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        
        
        await this.logMobileVerificationRequest({
          userId,
          brandId,
          mobileNo,
          provider,
          serviceType,
          status: "FAILED",
          request: requestPayload,
          response: { code: 408, message: "Request timeout" },
          isValid: false,
          errorMessage: "Driving license verification timed out. Please try again.",
        });

        throw new HttpException(
          {
            message: "Driving license verification timed out. Please try again.",
            provider,
            serviceType,
            success: false,
            code: 408,
          },
          HttpStatus.REQUEST_TIMEOUT
        );
      }

      this.logError(provider, serviceType, mobileNo, error, userId);

      if (error instanceof HttpException) {
        await this.logMobileVerificationRequest({
          userId,
          brandId,
          mobileNo,
          provider,
          serviceType,
          status: "FAILED",
          request: requestPayload,
          response: error.getResponse(),
          isValid: false,
          errorMessage: error.message,
        });
        throw error;
      }

      const userFriendlyMessage = this.getErrorMessage(serviceType);
      
      await this.logMobileVerificationRequest({
        userId,
        brandId,
        mobileNo,
        provider,
        serviceType,
        status: "FAILED",
        request: requestPayload,
        response: error?.response?.data || null,
        isValid: false,
        errorMessage: userFriendlyMessage,
      });

      throw new HttpException(
        {
          message: userFriendlyMessage,
          provider,
          serviceType,
          success: false,
          code: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        },
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Unified mobile verification with service type selection (with enhanced cache logic)
   */
  async verifyMobileWithService(
    serviceType: MobileServiceType,
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string
  ): Promise<MobileVerificationUnifiedResponse> {
    // Check if provider is configured
    await this.getActiveMobileVerificationProvider(brandId, serviceType);

    // Enhanced cache check (both data and error cache)
    const cachedResult = await this.checkCache(userId, serviceType, brandId);
    if (cachedResult) {
      return cachedResult;
    }

    // Get phone number from user table
    const mobileNo = await this.getUserPhoneNumber(userId, brandId);

    this.logRequest(
      BrandProviderName.KYCKART,
      serviceType,
      mobileNo,
      userId,
      brandId
    );

    switch (serviceType) {
      case "MOBILE_TO_ADDRESSES":
        return this.verifyMobileToAddressesWithKycKart(
          userId,
          brandId,
          checkId,
          groupId
        );

      case "MOBILE_TO_ADDRESSES_ECOM":
        return this.verifyMobileToAddressesEcomWithKycKart(
          userId,
          brandId,
          checkId,
          groupId
        );

      case "MOBILE_TO_LPG_DETAILS":
        return this.verifyMobileToLpgDetailsWithKycKart(
          userId,
          brandId,
          checkId,
          groupId
        );

      case "MOBILE_TO_DL_ADVANCED":
        return this.verifyMobileToDLAdvancedWithKycKart(
          userId,
          brandId,
          checkId
        );

      default:
        throw new HttpException(
          `Unsupported service type: ${serviceType}`,
          HttpStatus.BAD_REQUEST
        );
    }
  }

  /**
   * Batch verify mobile with all 4 KycKart services (with enhanced cache logic)
   */
  async verifyMobileBatchWithKycKart(
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string
  ): Promise<MobileVerificationBatchResponse> {
    // Get phone number from user table
    const mobileNo = await this.getUserPhoneNumber(userId, brandId);

    this.logger.log(
      `Starting BATCH mobile verification | Mobile: ${mobileNo?.substring(0, 3)}XXX${mobileNo?.substring(6)} | User: ${userId}`
    );

    const batchStartTime = Date.now();

    // Execute all 4 services in parallel with error handling
    const services = [
      { 
        name: "mobileToAddresses", 
        method: () => this.verifyMobileToAddressesWithKycKart(userId, brandId, checkId, groupId),
        timeout: 35000
      },
      { 
        name: "mobileToAddressesEcom", 
        method: () => this.verifyMobileToAddressesEcomWithKycKart(userId, brandId, checkId, groupId),
        timeout: 35000
      },
      { 
        name: "mobileToLpgDetails", 
        method: () => this.verifyMobileToLpgDetailsWithKycKart(userId, brandId, checkId, groupId),
        timeout: 35000
      },
      { 
        name: "mobileToDlAdvanced", 
        method: () => this.verifyMobileToDLAdvancedWithKycKart(userId, brandId, checkId),
        timeout: 65000 // Increased to 65 seconds for DL to match the 60s API timeout
      },
    ];

    // Create promises with individual timeouts
    const promises = services.map(service => {
      return Promise.race([
        service.method(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Service ${service.name} timeout after ${service.timeout}ms`)), service.timeout)
        )
      ]);
    });

    const results = await Promise.allSettled(promises);

    const batchDuration = Date.now() - batchStartTime;

    // Process results
    const batchResponse: any = {};
    let successCount = 0;
    let failureCount = 0;

    services.forEach((service, index) => {
      const result = results[index];
      
      if (result.status === "fulfilled") {
        batchResponse[service.name] = result.value;
        successCount++;
      } else {
        batchResponse[service.name] = {
          success: false,
          data: null,
          message: result.reason?.response?.message || result.reason?.message || `Failed to verify ${service.name}`,
          provider: BrandProviderName.KYCKART,
          error: result.reason?.response || { message: result.reason?.message },
          serviceType: service.name.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '')
        };
        failureCount++;
        
        
      }
    });

    this.logger.log(
      `BATCH mobile verification completed in ${batchDuration}ms | ` +
      `Success: ${successCount} | Failed: ${failureCount} | ` +
      `Mobile: ${mobileNo?.substring(0, 3)}XXX${mobileNo?.substring(6)}`
    );

    return batchResponse as MobileVerificationBatchResponse;
  }

  /**
   * Get mobile verification logs for a brand
   */
  async getMobileVerificationLogs(
    brandId: string,
    serviceType?: string,
    provider?: string,
    skip: number = 0,
    take: number = 20
  ) {
    const where: any = { brandId };

    if (serviceType) {
      where.serviceType = serviceType;
    }
    if (provider) {
      where.provider = provider;
    }

    const [logs, total] = await Promise.all([
      this.prisma.mobile_verification_logs.findMany({
        where,
        include: {
          users: {
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
      this.prisma.mobile_verification_logs.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }

  /**
 * Get all mobile verification logs for a brand
 */
async getAllMobileVerificationLogs(brandId: string) {
  try {
    const logs = await this.prisma.mobile_verification_logs.findMany({
      where: { brandId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return logs;
  } catch (error) {
    this.logger.error('Failed to fetch mobile verification logs:', error);
    throw new HttpException(
      'Failed to fetch mobile verification logs',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
}
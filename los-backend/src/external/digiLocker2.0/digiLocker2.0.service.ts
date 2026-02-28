import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "src/prisma/prisma.service";
import { DigiLocker20Config } from "./interfaces/digiLocker2.0-config.interface";
import {
  DigiLockerFile,
  DigiLockerResponse,
  DigiLockerUnifiedResponse,
  DigiLockerUserDetails,
} from "./interfaces/digiLocker2.0-response.interface";
import { CreateDigiLockerUrlDto } from "./dto/common-digilocker.dto";
import { SignzyCallbackDto } from "./dto/signzy-callback.dto";
import { v4 as uuidV4 } from "uuid";
import { document_status_enum, DocumentTypeEnum } from "@prisma/client";
import { AadhaarKycApiResponse } from "src/libs/interfaces/digitap";

// Digilocker File
interface DigilockerFile {
  docLink: string;
  docType: "AADHAAR" | "DIGILOCKER_PDF" | string;
  docExtension: "xml" | "pdf" | string;
}

// Address
interface Address {
  house: string;
  street: string;
  landmark: string;
  loc: string;
  po: string;
  dist: string;
  subdist: string;
  vtc: string;
  pc: string;
  state: string;
  country: string;
}

// Success Data
interface WebhookSuccessData {
  status: "s";
  uniqueId: string;
  maskedAdharNumber: string;
  name: string;
  gender: "M" | "F" | "T";
  dob: string;
  careOf: string;
  address: Address;
  image: string;
  xmlResponse: string;
  digilockerFiles: DigilockerFile[];
}

// Success Payload
interface WebhookSuccessPayload {
  transactionId: string;
  status: "Success";
  data: WebhookSuccessData;
}

// Failure Payload
interface WebhookFailurePayload {
  transactionId: string;
  status: "failure";
  code: string;
  model: null;
  msg: string;
  errorCode: string;
}

// Union Type
type WebhookPayload = WebhookSuccessPayload | WebhookFailurePayload;
@Injectable()
export class DigiLocker20Service {
  private readonly logger = new Logger(DigiLocker20Service.name);

  constructor(
    @Inject("DIGILOCKER20_CONFIG")
    private readonly config: DigiLocker20Config,
    private readonly httpService: HttpService,
    private readonly prismaService: PrismaService,
  ) {}

  private isOptimizedCreationEnabled = false;

  async createDigiLockerUrlWithSignzy(
    dto: CreateDigiLockerUrlDto,
  ): Promise<DigiLockerUnifiedResponse> {
    const internalId = uuidV4();

    const url = `${this.config.signzy.baseUrl}/api/v3/digilocker-v2/createUrl`;

    this.logger.log(
      `[DigiLocker-Signzy] Creating URL for userId: ${dto.userId}, brandId: ${dto.brandId}`,
    );

    const provider = await this.prismaService.brandProvider.findFirst({
      where: {
        brandId: dto.brandId,
        type: "AADHAAR_DIGILOCKER",
        provider: "SIGNZY",
      },
    });

    if (!provider || !provider.isActive || provider.isDisabled) {
      throw new HttpException(
        "Signzy provider is not available for this brand",
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: dto.userId },
      include: {
        brandSubDomain: true,
        brand: { include: { brand_sub_domains: true } },
      },
    });

    const domain =
      user?.brandSubDomain?.subdomain ||
      user?.brand?.brand_sub_domains?.[0]?.subdomain;

    const requestPayload = {
      signup: true,
      redirectUrl: `https://${domain}/signzy/digilocker/redirect/${dto.brandId}/${dto.userId}/${user?.onboardingStep || 1}`,
      redirectTime: "1",
      callbackUrl: `${process.env.WEBHOOK_BASE_URL}/partner/brand/${dto.brandId}/digilocker/signzy/callback`,
      successRedirectUrl: `https://${domain}/signzy/digilocker/redirect/${dto.brandId}/${dto.userId}/${user?.onboardingStep || 1}`,
      successRedirectTime: "5",
      failureRedirectUrl: `https://${domain}/signzy/digilocker/failed/${dto.brandId}/${dto.userId}/${user?.onboardingStep || 1}`,
      failureRedirectTime: "5",
      logoVisible: "true",
      logo: user.brand.logoUrl || "",
      supportEmailVisible: "true",
      supportEmail: "sameer@8byte.ai",
      docType: ["ADHAR"],
      purpose: "kyc",
      getScope: true,
      consentValidTill: Math.floor(Date.now() / 1000) + 86400,
      showLoaderState: true,
      internalId,
      companyName: "Signzy",
      favIcon: user.brand.logoUrl || "",
    };
    // const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const existingDigiLockerRequest =
      await this.prismaService.aadhaar_digi_locker_log.findFirst({
        where: {
          userId: dto.userId,
          brandId: dto.brandId,
          provider: "SIGNZY",
          status: "SUCCESS",
          requestType: "CREATE_URL",
          createdAt: { gte: tenMinutesAgo },
        },
        orderBy: { createdAt: "desc" },
      });

    const existingData = existingDigiLockerRequest?.response || {};

    if (
      existingDigiLockerRequest &&
      existingData &&
      this.isOptimizedCreationEnabled
    ) {
      const existingResult = (existingData as any)?.result || {};
      const existingUrl = existingResult.url || "";
      const existingRequestId =
        existingResult.requestId || (existingData as any)?.id;

      if (existingUrl && existingRequestId) {
        this.logger.log(
          `[DigiLocker-Signzy] Using existing successful URL for userId: ${dto.userId} | RequestId: ${existingRequestId}`,
        );

        return {
          success: true,
          message: "DigiLocker URL retrieved from existing successful request",
          url: existingUrl,
          id: existingRequestId,
          provider: "SIGNZY",
          raw: existingData,
        };
      }
    }
    try {
      const startTime = Date.now();
      const { data } = await firstValueFrom(
        this.httpService.post(url, requestPayload, {
          headers: {
            Authorization: this.config.signzy.accessToken,
            "Content-Type": "application/json",
          },
        }),
      );

      const duration = Date.now() - startTime;

      // ---- SAFE RESPONSE MAPPING ---- //
      const result = data?.result || {};

      const finalUrl = result.url || "";
      const requestId = result.requestId || data?.id || internalId;

      const isSuccess = Boolean(finalUrl);

      this.logger.debug(
        `[DigiLocker-Signzy] URL created in ${duration}ms | SignzyRequestId=${requestId}`,
      );

      // Log
      await this.logDigiLockerRequest({
        userId: dto.userId,
        brandId: dto.brandId,
        provider: "SIGNZY",
        requestType: "CREATE_URL",
        status: isSuccess ? "SUCCESS" : "FAILED",
        request: {
          ...requestPayload,
          userId: dto.userId,
          brandId: dto.brandId,
        },
        response: data,
        digiLockerId: requestId,
        errorMessage: isSuccess ? null : "Failed to create URL",
        callbackData: null,
      });

      if (!isSuccess) {
        throw new HttpException(
          "Failed to create DigiLocker URL",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: "DigiLocker URL created successfully (Signzy)",
        url: finalUrl,
        id: requestId,
        provider: "SIGNZY",
        raw: data,
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create DigiLocker URL";

      this.logger.error(
        `[DigiLocker-Signzy] Failed to create URL for userId: ${dto.userId}`,
        error?.response?.data || error,
      );

      await this.logDigiLockerRequest({
        userId: dto.userId,
        brandId: dto.brandId,
        provider: "SIGNZY",
        requestType: "CREATE_URL",
        status: "FAILED",
        request: {
          ...requestPayload,
          userId: dto.userId,
          brandId: dto.brandId,
        },
        response: error?.response?.data || null,
        digiLockerId: null,
        errorMessage,
        callbackData: null,
      });

      throw new HttpException(
        errorMessage,
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private formatDateToDDMMYYYY(input: string): Date | null {
    if (!input) return null;

    try {
      let year: number, month: number, day: number;

      // Handle MM-DD-YY format (Digitap: "01-15-00")
      if (/^\d{2}-\d{2}-\d{2}$/.test(input)) {
        const [m, d, y] = input.split("-").map(Number);
        month = m;
        day = d;
        year = y <= 30 ? 2000 + y : 1900 + y;
      }

      // Handle MM-DD-YYYY format
      else if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
        const [m, d, y] = input.split("-").map(Number);
        month = m;
        day = d;
        year = y;
      }

      // Handle DD/MM/YYYY format
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
        const [d, m, y] = input.split("/").map(Number);
        day = d;
        month = m;
        year = y;
      }

      // Handle ISO or unknown formats
      else {
        const date = new Date(input);
        if (isNaN(date.getTime())) return null;
        return date; // already valid ISO
      }

      // Validate components
      if (
        !year ||
        !month ||
        !day ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
      ) {
        return null;
      }

      // Convert to real Date object
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}T00:00:00.000Z`;

      const parsed = new Date(iso);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      console.warn(`Failed to parse date: ${input}`, error);
      return null;
    }
  }

  async generateKycUnifiedUrlWithDigitap(
    dto: CreateDigiLockerUrlDto,
  ): Promise<DigiLockerUnifiedResponse> {
    const clientUniqueId = uuidV4();
    const url = `https://svc.digitap.ai/kyc-unified/v1/generate-url/`;
    // Check provider availability
    const provider = await this.prismaService.brandProvider.findFirst({
      where: {
        brandId: dto.brandId,
        type: "AADHAAR_DIGILOCKER",
        provider: "DIGITAP",
      },
    });

    if (!provider || !provider.isActive || provider.isDisabled) {
      throw new HttpException(
        "Digitap provider is not available for this brand",
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: dto.userId },
      include: {
        brandSubDomain: true,
        brand: { include: { brand_sub_domains: true } },
      },
    });

    const domain =
      user?.brandSubDomain?.subdomain ||
      user?.brand?.brand_sub_domains?.[0]?.subdomain;

    const requestPayload = {
      uniqueId: clientUniqueId,
      redirectionUrl: dto.isSkipRedirection
        ? undefined
        : `https://${domain}/digitap/digilocker/redirect/${dto.brandId}/${dto.userId}/${user?.onboardingStep || 1}`,
      expiryHours: 72,
    };
    // const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const existingDigiLockerRequest =
      await this.prismaService.aadhaar_digi_locker_log.findFirst({
        where: {
          userId: dto.userId,
          brandId: dto.brandId,
          provider: "DIGITAP",
          status: "SUCCESS",
          requestType: "CREATE_URL",
          createdAt: { gte: tenMinutesAgo },
        },
        orderBy: { createdAt: "desc" },
      });

    const existingData = (existingDigiLockerRequest?.response || {}) as any;

    // If existing successful request exists, return it instead of creating new one
    if (
      existingDigiLockerRequest &&
      existingData &&
      this.isOptimizedCreationEnabled
    ) {
      const existingModel = existingData?.model || {};
      const existingUrl = existingModel.url || existingModel.shortUrl || "";
      const existingUnifiedTxnId = existingModel.unifiedTransactionId || null;

      if (existingUrl && existingUnifiedTxnId) {
        this.logger.log(
          `[Digitap] Using existing successful URL for userId: ${dto.userId} | UnifiedTxnId: ${existingUnifiedTxnId}`,
        );

        return {
          success: true,
          message: "KYC Unified URL retrieved from existing successful request",
          url: existingUrl,
          id: existingUnifiedTxnId,
          uniqueId: existingModel.uniqueId || clientUniqueId,
          provider: "DIGITAP",
          raw: existingData,
        };
      }
    }

    // If no existing data, proceed with creating new request
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            uniqueId: uuidV4(),
            redirectionUrl: dto.isSkipRedirection
              ? undefined
              : `https://${domain}/digitap/digilocker/redirect/${dto.brandId}/${dto.userId}/${user?.onboardingStep || 1}`,
            expiryHours: 72, // Optional, default is 72
          },
          {
            headers: {
              Authorization: `Basic ${this.config.digitap.authKey}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );
      const model = data?.model || {};
      const finalUrl = model.shortUrl || model.url || "";
      const providerUniqueId = model.uniqueId || clientUniqueId;
      const unifiedTxnId = model.unifiedTransactionId || null;
      const isSuccess = finalUrl;

      // Log to DB
      await this.logDigiLockerRequest({
        userId: dto.userId,
        brandId: dto.brandId,
        provider: "DIGITAP",
        requestType: "CREATE_URL",
        status: isSuccess ? "SUCCESS" : "FAILED",
        request: { ...requestPayload },
        response: data,
        digiLockerId: unifiedTxnId,
        errorMessage: isSuccess ? null : data?.error || "Unknown error",
        callbackData: null,
      });

      if (!isSuccess) {
        throw new HttpException(
          data?.error || "Failed to generate URL",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: "KYC Unified URL generated successfully (Digitap)",
        url: finalUrl,
        id: unifiedTxnId,
        uniqueId: providerUniqueId,
        provider: "DIGITAP",
        raw: data,
      };
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Digitap KYC Unified URL generation failed";

      await this.logDigiLockerRequest({
        userId: dto.userId,
        brandId: dto.brandId,
        provider: "DIGITAP",
        requestType: "CREATE_URL",
        status: "FAILED",
        request: { ...requestPayload },
        response: error?.response?.data || null,
        digiLockerId: null,
        errorMessage: message,
        callbackData: null,
      });

      throw new HttpException(
        message,
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateUrlWithFallback(
    dto: CreateDigiLockerUrlDto,
  ): Promise<DigiLockerUnifiedResponse> {
    const provider = await this.prismaService.brandProvider.findMany({
      where: {
        brandId: dto.brandId,
        type: "AADHAAR_DIGILOCKER",
        isActive: true,
        isDisabled: false,
      },
      orderBy: { isPrimary: "desc" },
    });
    if (!provider || provider.length === 0) {
      throw new HttpException(
        "No active DigiLocker providers configured for this brand",
        HttpStatus.BAD_REQUEST,
      );
    }
    for (const prov of provider) {
      try {
        if (prov.provider === "DIGITAP") {
          return await this.generateKycUnifiedUrlWithDigitap(dto);
        } else if (prov.provider === "SIGNZY") {
          return await this.createDigiLockerUrlWithSignzy(dto);
        }
      } catch (error) {
        this.logger.warn(
          `[DigiLocker-Fallback] Provider (${prov.provider.toUpperCase()}) failed, attempting next provider`,
          error?.message,
        );
        continue; // Try next provider
      }
    }
  }

  async handleSignzyCallback(
    brandId: string,
    callbackData: SignzyCallbackDto,
  ): Promise<DigiLockerUnifiedResponse> {
    try {
      // Find the original request using internalId or id
      const userId = callbackData.internalId || callbackData.id;

      if (!userId) {
        throw new BadRequestException("Missing userId in callback");
      }

      // Fetch user and document
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          documents: {
            where: { type: DocumentTypeEnum.AADHAAR },
            select: { id: true, status: true },
          },
          userDetails: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User not found: ${userId}`);
      }

      const document = user.documents?.[0];
      if (document && document?.status === document_status_enum.APPROVED) {
        return {
          success: true,
          message:
            "Aadhaar document already approved, skipping callback processing",
          documents: [],
          provider: "SIGNZY",
          raw: callbackData,
        };
      }
      // if (!document) {
      //   throw new BadRequestException("Aadhaar document not found");
      // }
      const isSuccess = callbackData.status === "success";

      // Log the callback
      await this.logDigiLockerRequest({
        userId,
        brandId,
        provider: "SIGNZY",
        requestType: "CALLBACK",
        status: isSuccess ? "SUCCESS" : "FAILED",
        request: null,
        response: null,
        digiLockerId: callbackData.id,
        errorMessage: callbackData.error || callbackData.message || null,
        callbackData: callbackData,
      });

      // If success, update document and user details with Aadhaar data
      if (isSuccess && callbackData.aadharDetail) {
        await this.processSignzyAadhaarData(
          userId,
          brandId,
          // document.id,
          callbackData.aadharDetail,
          callbackData.details,
          callbackData, // Pass full callback data to store
        );
      }
      return {
        success: isSuccess,
        message: isSuccess
          ? "Signzy DigiLocker callback processed successfully"
          : `Signzy DigiLocker callback received with failure: ${callbackData.error || callbackData.message || "Unknown error"}`,
        documents: callbackData.details?.files as any,
        provider: "SIGNZY",
        raw: callbackData,
      };
    } catch (error) {
      throw new HttpException(
        "Failed to process Signzy DigiLocker callback",
        error?.message || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async processSignzyAadhaarData(
    userId: string,
    brandId: string,
    aadharDetail: any,
    details: any,
    fullCallbackData?: any, // Add optional parameter to store full callback
  ): Promise<void> {
    try {
      if (!userId || !brandId) {
        throw new Error("Missing userId or brandId");
      }
      this.logger.log(
        `[DigiLocker-Signzy] Processing Aadhaar data for userId: ${userId}`,
      );

      // Format the Aadhaar data with full callback stored
      const formattedAadhaarData = {
        personalDetails: {
          name: aadharDetail?.name || "",
          uid: aadharDetail?.uid || "",
          dob: aadharDetail?.dob || "",
          gender: aadharDetail?.gender || "",
          careOf: aadharDetail?.careOf || "",
        },
        addressDetails: {
          fullAddress: aadharDetail?.address || "",
          district: aadharDetail?.splitAddress?.district?.[0] || "",
          state: aadharDetail?.splitAddress?.state?.[0]?.[0] || "",
          city: aadharDetail?.splitAddress?.city?.[0] || "",
          pincode: aadharDetail?.splitAddress?.pincode || "",
          landmark: aadharDetail?.splitAddress?.landMark || "",
          country: aadharDetail?.splitAddress?.country?.[0] || "",
        },
        documentLinks: {
          photoUrl: aadharDetail?.photo || "",
          xmlFileLink: aadharDetail?.xmlFileLink || "",
          certificate: aadharDetail?.x509Data?.certificate || "",
        },
        verification: {
          validAadhaarDSC: aadharDetail?.x509Data?.validAadhaarDSC || "no",
          issuerId: details?.userDetails?.digilockerid || "",
          eaadhaar: details?.userDetails?.eaadhaar || "N",
        },
        signatureData: aadharDetail?.signatureData || {},
        // Store complete callback data
        rawCallbackData: fullCallbackData || null,
      };

      try {
        await this.prismaService.userDetails.update({
          where: { userId },
          data: {
            aAdharName: aadharDetail?.name || "",
            aAdharDOB: aadharDetail?.dob
              ? this.formatDateToDDMMYYYY(aadharDetail.dob)
              : undefined,
          },
        });
      } catch (error) {
        this.logger.error(
          `[DigiLocker-Signzy] Failed to update user details for userId: ${userId}`,
          error?.message || error,
        );
      }
      // (await this.prismaService.document.update({
      //   where: { id: documentId },
      //   data: {
      //     status: document_status_enum.APPROVED,
      //     verifiedAt: new Date(),
      //     documentNumber: aadharDetail?.uid || "",
      //     providerData: formattedAadhaarData,
      //   },
      // }),
      // this.logger.log(
      //   `[DigiLocker-Signzy] Successfully processed Aadhaar data for userId: ${userId}, document approved`
      // ));
      await this.prismaService.document.upsert({
        where: {
          userId_type: {
            userId,
            type: DocumentTypeEnum.AADHAAR,
          },
        },
        create: {
          userId,
          type: DocumentTypeEnum.AADHAAR,
          status: document_status_enum.APPROVED,
          verifiedAt: new Date(),
          documentNumber: aadharDetail?.uid || null,
          providerData: formattedAadhaarData,
        },
        update: {
          updatedAt: new Date(),
          status: document_status_enum.APPROVED,
          verifiedAt: new Date(),
          documentNumber: aadharDetail?.uid || null,
          providerData: formattedAadhaarData,
        },
      });
      this.logger.log(
        `[DigiLocker-Signzy] Successfully processed Aadhaar data for userId: ${userId}, document upserted`,
      );
    } catch (error) {
      this.logger.error(
        `[DigiLocker-Signzy] Failed to process Aadhaar data for userId: ${userId}`,
        error?.message || error,
      );
      // Don't throw - let the callback succeed even if data processing fails
    }
  }

  async getDigitapDetails(
    unifiedTransactionId: string,
  ): Promise<AadhaarKycApiResponse> {
    const url = `https://svc.digitap.ai/kyc-unified/v1/${unifiedTransactionId}/details/`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Basic ${this.config.digitap.authKey}`,
            "Content-Type": "application/json",
          },
        }),
      );
      return data;
    } catch (error) {
      console.error("Get KYC Details Error:", error?.response?.data || error);
      throw new HttpException(
        error?.response?.data || "Failed to fetch KYC details",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSignzyDetails(requestId: string): Promise<DigiLockerResponse> {
    const url = `https://api.signzy.app/api/v3/digilocker-v2/getDetails`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          { requestId: requestId },
          {
            headers: {
              Authorization: this.config.signzy.accessToken,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      return data;
    } catch (error) {
      console.error(
        "Get Signzy KYC Details Error:",
        error?.response?.data || error,
      );
      throw new HttpException(
        error?.response?.data || "Failed to fetch Signzy KYC details",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async pullDigiLockerDocument(
    unifiedTransactionId: string,
    digiLockerData: any,
  ): Promise<any> {
    const url = `https://api.signzy.app/api/v3/digilocker-v2/pullDocumentsV2`;
    try {
      // Safely extract userDetails + first file
      const userDetails = digiLockerData?.result?.userDetails;
      const file = digiLockerData?.result?.files?.[0];

      if (!file) {
        throw new BadRequestException(
          "No documents found in DigiLocker response",
        );
      }

      const digilockerid = userDetails?.digilockerid || null;
      const docType = file?.doctype || null;
      const orgid = file?.issuerid || null;

      if (!digilockerid || !docType || !orgid) {
        throw new BadRequestException(
          `Missing required DigiLocker params. 
         digilockerid=${digilockerid}, docType=${docType}, orgid=${orgid}`,
        );
      }

      const payload = {
        requestId: unifiedTransactionId,
        docType,
        orgid,
        consent: "Y",
        searchParameters: { digilockerid },
        getBase64Files: true,
      };
      const { data } = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: this.config.signzy.accessToken,
            "Content-Type": "application/json",
          },
        }),
      );
      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to pull DigiLocker documents",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async logDigiLockerRequest(logData: {
    userId: string;
    brandId: string;
    provider: string;
    requestType: string;
    status: string;
    request: any;
    response: any;
    digiLockerId: string | null;
    errorMessage: string | null;
    callbackData: any;
  }): Promise<void> {
    try {
      // Validate that brand exists before logging
      const brandExists = await this.prismaService.brand.findUnique({
        where: { id: logData.brandId },
      });

      if (!brandExists) {
        return;
      }

      // Create a log entry in the database
      await this.prismaService.aadhaar_digi_locker_log.create({
        data: {
          userId: logData.userId,
          brandId: logData.brandId,
          provider: logData.provider,
          requestType: logData.requestType,
          status: logData.status,
          request: logData.request,
          response: logData.response,
          digiLockerId: logData.digiLockerId,
          errorMessage: logData.errorMessage,
        },
      });
    } catch (error) {
      this.logger.error(
        `[DigiLocker] Failed to log request to database`,
        error?.message || error,
      );
      // Don't throw error here, just log it to prevent disrupting the main flow
    }
  }

  async getDigiLockerLogs(
    brandId: string,
    provider?: string,
    requestType?: string,
    status?: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    try {
      const where: any = { brandId };

      if (provider) {
        where.provider = provider;
      }

      if (requestType) {
        where.requestType = requestType;
      }

      if (status) {
        where.status = status;
      }

      // Note: Uncomment when aadhaar_digi_locker_log model is added to Prisma schema
      const [data, total] = await Promise.all([
        this.prismaService.aadhaar_digi_locker_log.findMany({
          where,
          skip,
          take,
          orderBy: {
            createdAt: "desc",
          },
        }),
        this.prismaService.aadhaar_digi_locker_log.count({ where }),
      ]);
      return { data: data, total: total };
    } catch (error) {
      throw new HttpException(
        "Failed to fetch DigiLocker logs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDigiLockerRequestById(
    brandId: string,
    digiLockerId: string,
  ): Promise<any> {
    try {
      // Note: Uncomment when aadhaar_digi_locker_log model is added to Prisma schema
      const log = await this.prismaService.aadhaar_digi_locker_log.findFirst({
        where: {
          brandId,
          digiLockerId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!log) {
        throw new HttpException(
          "DigiLocker request not found",
          HttpStatus.NOT_FOUND,
        );
      }
      return log;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch DigiLocker request",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handleDigitapManualSync(
    userId: string,
    brandId: string,
  ): Promise<DigiLockerUnifiedResponse> {
    try {
      if (!brandId) {
        throw new BadRequestException("Missing brandId");
      }

      // -------------------------------------------------------------
      // 1. Find logs for this user + brand
      // -------------------------------------------------------------
      const logs = await this.prismaService.aadhaar_digi_locker_log.findMany({
        where: {
          userId,
          brandId,
          provider: "DIGITAP",
          requestType: "CREATE_URL",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!logs.length) {
        throw new NotFoundException("No Digitap logs found for this user");
      }

      let finalUpdatedDocument = null;
      for (const log of logs) {
        const logUserId = log.userId;
        if (!logUserId) continue;

        // -------------------------------------------------------------
        // 2. Fetch user + Aadhaar document
        // -------------------------------------------------------------
        const user = await this.prismaService.user.findUnique({
          where: { id: logUserId },
          include: {
            documents: {
              where: { type: DocumentTypeEnum.AADHAAR },
              select: { id: true, status: true },
            },
          },
        });

        if (!user) continue;

        const document = user.documents?.[0];
        // if (!document) continue;

        if (document && document?.status === "APPROVED") {
          return {
            success: true,
            message: "Document? already approved",
            provider: "DIGITAP",
            raw: document,
          };
        }

        if (document && document?.status === "REJECTED") {
          throw new BadRequestException("Document already rejected");
        }

        // -------------------------------------------------------------
        // 3. Get unified KYC details
        // -------------------------------------------------------------
        const unifiedTransactionId = log.digiLockerId;

        if (!unifiedTransactionId) {
          throw new BadRequestException(
            "Missing unifiedTransactionId/requestId in log",
          );
        }

        let unifiedTransactionDetails: any;
        try {
          unifiedTransactionDetails =
            await this.getDigitapDetails(unifiedTransactionId);
        } catch (error) {
          continue; // Try next log
        }
        const model = unifiedTransactionDetails?.model;

        // -------------------------------------------------------------
        // 4. Format response with full unified transaction details
        // -------------------------------------------------------------
        const formattedResponse = {
          personalDetails: {
            name: model?.name ?? "",
            dob: model?.dob ?? "",
            gender: model?.gender ?? "",
            careOf: model?.careOf ?? "",
            aadhaarNumber: model?.maskedAdharNumber ?? "",
          },
          addressDetails: {
            house: model?.address?.house ?? "",
            street: model?.address?.street ?? "",
            landmark: model?.address?.landmark ?? "",
            locality: model?.address?.loc ?? "",
            postOfficeName: model?.address?.po ?? "",
            subDistrict: model?.address?.subdist ?? "",
            district: model?.address?.dist ?? "",
            state: model?.address?.state ?? "",
            country: model?.address?.country ?? "",
            pincode: model?.address?.pc ?? "",
            vtcName: model?.address?.vtc ?? "",
          },
          documentLinks: {
            downloadLink: model?.pdfLink ?? "",
            xmlLink: model?.link ?? "",
            imageBase64: model?.image ?? "",
          },
          verification: {
            isXmlValid: !!model?.link,
            passCode: model?.passCode ?? "",
            uniqueId: model?.uniqueId ?? "",
            referenceId: model?.referenceId ?? "",
            source: model?.source ?? "",
          },
          rawCallbackData: JSON.parse(
            JSON.stringify(unifiedTransactionDetails),
          ),
        };
        try {
          await this.prismaService.userDetails.update({
            where: { userId: logUserId },
            data: {
              aAdharName: model?.name ?? "",
              aAdharDOB: model?.dob
                ? this.formatDateToDDMMYYYY(model.dob)
                : undefined,
              linkedAadhaarNumberByDigiLocker: model?.maskedAdharNumber ?? "",
            },
          });
        } catch (error) {
          this.logger.error(
            `[Digitap-Manual-Success] Failed to update user details for userId: ${logUserId}`,
            error?.message || error,
          );
        }
        const updatedDoc = await this.prismaService.document.upsert({
          where: {
            userId_type: {
              userId: logUserId,
              type: DocumentTypeEnum.AADHAAR,
            },
          },
          create: {
            id: uuidV4(),
            documentNumber: model?.maskedAdharNumber || null,
            userId: logUserId,
            type: DocumentTypeEnum.AADHAAR,
            status: document_status_enum.APPROVED,
            verifiedAt: new Date(),
            providerData: formattedResponse,
          },
          update: {
            updatedAt: new Date(),
            documentNumber: model?.maskedAdharNumber || null,
            status: document_status_enum.APPROVED,
            verifiedAt: new Date(),
            providerData: formattedResponse,
          },
        });
        this.logger.log(
          `[Digitap-Manual-Success] Successfully processed Aadhaar data for userId: ${logUserId}, document approved`,
        );
        finalUpdatedDocument = updatedDoc;
        // -------------------------------------------------------------
        // 6. Log the manual success
        // -------------------------------------------------------------
        await this.logDigiLockerRequest({
          userId: logUserId,
          brandId,
          provider: "DIGITAP",
          requestType: "MANUAL_SUCCESS",
          status: "SUCCESS",
          request: null,
          response: formattedResponse,
          digiLockerId: unifiedTransactionId,
          errorMessage: null,
          callbackData: null,
        });

        break; // stop after first successful update
      }

      // -------------------------------------------------------------
      // Final result
      // -------------------------------------------------------------
      return {
        success: true,
        message: "Digitap Aadhaar KYC approved successfully",
        provider: "DIGITAP",
        raw: finalUpdatedDocument,
      };
    } catch (err) {
      this.logger.error(
        `[Digitap-Manual-Success] Failed to process manual success for userId: ${userId}`,
        err?.message || err,
      );
      await this.logDigiLockerRequest({
        userId,
        brandId,
        provider: "DIGITAP",
        requestType: "MANUAL_SUCCESS",
        status: "FAILED",
        request: null,
        response: null,
        digiLockerId: null,
        errorMessage: err?.message || "Manual success processing failed",
        callbackData: null,
      });

      throw new HttpException(
        "Digitap manual success processing failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // //. -- digitab webhook manual success handler
  // async handleDigitapWebhookManualSuccess(
  //   userId: string,

  async handleSignzyManualSync(
    userId: string,
    brandId: string,
  ): Promise<DigiLockerUnifiedResponse> {
    this.logger.log(
      `[Signzy-Manual-Success] Processing manual success for userId: ${userId}, brandId: ${brandId}`,
    );

    try {
      if (!brandId) {
        throw new BadRequestException("Missing brandId");
      }

      // -------------------------------------------------------------
      // 1. Find logs for this user + brand
      // -------------------------------------------------------------
      const logs = await this.prismaService.aadhaar_digi_locker_log.findMany({
        where: {
          userId,
          brandId,
          provider: "SIGNZY",
          requestType: "CREATE_URL",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!logs.length) {
        throw new NotFoundException("No Signzy logs found for this user");
      }

      let finalUpdatedDocument = null;

      // Process each log until one succeeds
      for (const log of logs) {
        const logUserId = log.userId;
        if (!logUserId) continue;

        // -------------------------------------------------------------
        // 2. Fetch user + Aadhaar document
        // -------------------------------------------------------------
        const user = await this.prismaService.user.findUnique({
          where: { id: logUserId },
          include: {
            documents: {
              where: { type: DocumentTypeEnum.AADHAAR },
              select: { id: true, status: true },
            },
            userDetails: true,
          },
        });

        if (!user) continue;

        const document = user.documents?.[0];
        // if (!document) continue;

        if (document && document?.status === "APPROVED") {
          return {
            success: true,
            message: "Document already approved",
            provider: "SIGNZY",
            raw: document,
          };
        }

        if (document && document?.status === "REJECTED") {
          throw new BadRequestException("Document already rejected");
        }

        // -------------------------------------------------------------
        // 3. Get Signzy details using digiLockerId
        // -------------------------------------------------------------
        const signzyRequestId = log.digiLockerId;

        if (!signzyRequestId) {
          this.logger.warn(
            `[Signzy-Manual-Success] No signzy request ID found in log for userId: ${logUserId}`,
          );
          continue;
        }

        let signzyDetails: DigiLockerResponse | null = null;
        try {
          signzyDetails = await this.getSignzyDetails(signzyRequestId);
        } catch (error) {
          this.logger.warn(
            `[Signzy-Manual-Success] Failed to fetch Signzy details for requestId: ${signzyRequestId}`,
            error?.message,
          );
          // Skip this log entry and continue to the next one
          continue;
        }

        // let pulledDocuments: any = null;
        // try {
        //   // Pull DigiLocker documents with Aadhaar data
        //   pulledDocuments = await this.pullDigiLockerDocument(
        //     signzyRequestId,
        //     signzyDetails
        //   );
        // } catch (error) {
        //   this.logger.warn(
        //     `[Signzy-Manual-Success] Failed to pull DigiLocker documents for requestId: ${signzyRequestId}`,
        //     error?.message
        //   );
        //   // Continue without pulled documents - use Signzy details instead
        // }

        this.logger.debug(
          `[Signzy-Manual-Success] Signzy details:`,
          JSON.stringify(signzyDetails, null, 2),
        );
        // this.logger.debug(
        //   `[Signzy-Manual-Success] Pulled documents:`,
        //   JSON.stringify(pulledDocuments, null, 2)
        // );
        // Extract Aadhaar data from Signzy response or use minimal data
        const userDetails: DigiLockerUserDetails = signzyDetails?.result
          ?.userDetails || {
          digilockerid: "",
          name: "",
          dob: "",
          gender: "",
          eaadhaar: "",
          mobile: "",
        };

        const files: DigiLockerFile[] = signzyDetails?.result?.files || [];

        const formattedResponse = {
          personalDetails: {
            name: userDetails.name || user?.userDetails?.aAdharName || "",
            uid: "", // DigiLocker does not return UID
            dob: userDetails.dob || "",
            gender: userDetails.gender || "",
            careOf: "", // Not available
          },

          addressDetails: {
            fullAddress: "",
            district: "",
            state: "",
            city: "",
            pincode: "",
            landmark: "",
            country: "India",
          },

          documentLinks: {
            photoUrl: "",
            xmlFileLink: "",
            certificate: "",
          },

          verification: {
            validAadhaarDSC: "no",
            issuerId: userDetails.digilockerid || "",
            eaadhaar: userDetails.eaadhaar === "Y" ? "Y" : "N",
          },

          signatureData: {},

          documents: files.map((doc) => ({
            name: doc.name || "",
            doctype: doc.doctype || "",
            description: doc.description || "",
            issuerId: doc.issuerid || "",
            issuerName: doc.issuer || "",
            documentId: doc.id || "",
            mimeTypes: Array.isArray(doc.mime) ? doc.mime : [],
            uploadedDate: doc.date || "",
          })),

          rawCallbackData: JSON.parse(
            JSON.stringify(
              signzyDetails || {
                manual: true,
                timestamp: new Date().toISOString(),
              },
            ),
          ),
        };

        // // -------------------------------------------------------------
        // // 5. Update DB transactionally
        // // -------------------------------------------------------------

        // await this.prismaService.$transaction([
        //   this.prismaService.userDetails.update({
        //     where: { userId: logUserId },
        //     data: {
        //       aAdharName:
        //         userDetails.name || user?.userDetails?.aAdharName || "",
        //       aAdharDOB: userDetails.dob
        //         ? this.formatDateToDDMMYYYY(userDetails.dob)
        //         : undefined,
        //     },
        //   }),
        //   this.prismaService.document.update({
        //     where: { id: document.id },
        //     data: {
        //       status: document_status_enum.APPROVED,
        //       verifiedAt: new Date(),
        //       documentNumber: "", // UID not available
        //       providerData: formattedResponse,
        //     },
        //   }),
        // ]);

        try {
          await this.prismaService.userDetails.update({
            where: { userId: logUserId },
            data: {
              aAdharName:
                userDetails.name || user?.userDetails?.aAdharName || "",
              aAdharDOB: userDetails.dob
                ? this.formatDateToDDMMYYYY(userDetails.dob)
                : undefined,
            },
          });
        } catch (error) {
          this.logger.error(
            `[Signzy-Manual-Success] Failed to update user details for userId: ${logUserId}`,
            error?.message || error,
          );
        }
        // const updatedDoc = await this.prismaService.document.update({
        //   where: { id: document.id },
        //   data: {
        //     status: document_status_enum.APPROVED,
        //     verifiedAt: new Date(),
        //     documentNumber: "", // UID not available
        //     providerData: formattedResponse,
        //   },
        // });
        await this.prismaService.document.upsert({
          where: {
            userId_type: {
              userId: logUserId,
              type: DocumentTypeEnum.AADHAAR,
            },
          },
          create: {
            id: uuidV4(),
            userId: logUserId,
            type: DocumentTypeEnum.AADHAAR,
            status: document_status_enum.APPROVED,
            verifiedAt: new Date(),
            documentNumber: null, // UID not available
            providerData: formattedResponse,
          },
          update: {
            updatedAt: new Date(),
            status: document_status_enum.APPROVED,
            verifiedAt: new Date(),
            documentNumber: null, // UID not available
            providerData: formattedResponse,
          },
        });

        this.logger.log(
          `[Signzy-Manual-Success] Successfully processed Aadhaar data for userId: ${logUserId}, document approved`,
        );
        // // -------------------------------------------------------------
        // // 6. Log the manual success
        // // -------------------------------------------------------------
        await this.logDigiLockerRequest({
          userId: logUserId,
          brandId,
          provider: "SIGNZY",
          requestType: "MANUAL_SUCCESS",
          status: "SUCCESS",
          request: null,
          response: formattedResponse,
          digiLockerId: signzyRequestId,
          errorMessage: null,
          callbackData: signzyDetails,
        });

        this.logger.log(
          `[Signzy-Manual-Success] Successfully approved document for userId: ${logUserId}`,
        );

        break; // stop after first successful update
      }

      // -------------------------------------------------------------
      // Final result
      // -------------------------------------------------------------
      return {
        success: true,
        message: "Signzy manual success processed - Document approved",
        provider: "SIGNZY",
        raw: finalUpdatedDocument,
      };
    } catch (error) {
      this.logger.error(
        `[Signzy-Manual-Success] Failed for userId: ${userId}`,
        error?.message || error,
      );

      await this.logDigiLockerRequest({
        userId,
        brandId,
        provider: "SIGNZY",
        requestType: "MANUAL_SUCCESS",
        status: "FAILED",
        request: null,
        response: null,
        digiLockerId: null,
        errorMessage:
          error?.message || "Signzy manual success processing failed",
        callbackData: null,
      });

      throw new HttpException(
        "Signzy manual success processing failed",
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Type Guards
  // private async isWebhookSuccess(
  //   payload: WebhookPayload,
  // ): payload is WebhookSuccessPayload {
  //   return payload.status === "Success";
  // }

  // private async isWebhookFailure(
  //   payload: WebhookPayload,
  // ): payload is WebhookFailurePayload {
  //   return payload.status === "failure";
  // }

  // Usage Example
  async handleDigitapWebhook(payload: WebhookPayload) {
    console.log("========== DIGITAP WEBHOOK START ==========");
    console.log(
      "📥 Received DigiLocker Webhook Payload:",
      JSON.stringify(payload, null, 2),
    );

    try {
      const transactionId = payload.transactionId;

      if (!transactionId) {
        console.warn("⚠️ No transactionId found in webhook payload");
        console.log("========== DIGITAP WEBHOOK END ==========");
        return;
      }

      console.log("🔎 Extracted transactionId:", transactionId);

      // Fetch DigiLocker log from DB
      console.log("🗄️ Fetching DigiLocker log from DB using digiLockerId...");
      const aadhaarDigiLockerLog =
        await this.prismaService.aadhaar_digi_locker_log.findFirst({
          where: {
            digiLockerId: transactionId,
          },
          orderBy: { createdAt: "desc" },
        });

      if (!aadhaarDigiLockerLog) {
        console.warn(
          "⚠️ No DigiLocker log found for transactionId:",
          transactionId,
        );
        console.log("========== DIGITAP WEBHOOK END ==========");
        return;
      }

      console.log("✅ DigiLocker log found:", {
        id: aadhaarDigiLockerLog.id,
        digiLockerId: aadhaarDigiLockerLog.digiLockerId,
        userId: aadhaarDigiLockerLog.userId,
        brandId: aadhaarDigiLockerLog.brandId,
        createdAt: aadhaarDigiLockerLog.createdAt,
      });

      const requestId = aadhaarDigiLockerLog?.digiLockerId || null;
      const userId = aadhaarDigiLockerLog?.userId || null;
      const brandId = aadhaarDigiLockerLog?.brandId || null;

      console.log("🧾 Extracted Details:");
      console.log("   requestId:", requestId);
      console.log("   userId:", userId);
      console.log("   brandId:", brandId);

      if (!userId || !brandId) {
        console.warn(
          "⚠️ Missing userId or brandId. Cannot proceed with manual sync.",
        );
        console.log("========== DIGITAP WEBHOOK END ==========");
        return;
      }

      console.log("🚀 Calling handleDigitapManualSync...");
      const result = await this.handleDigitapManualSync(userId, brandId);

      console.log("✅ handleDigitapManualSync completed successfully");
      console.log("📤 Result:", result);

      console.log("========== DIGITAP WEBHOOK END ==========");

      return result;
    } catch (error) {
      console.error("❌ ERROR in handleDigitapWebhook:");
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
      console.log("========== DIGITAP WEBHOOK END ==========");

      throw error;
    }
  }
}

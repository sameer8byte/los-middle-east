import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { FINDUIT_BASE_URL, AA_ENV } from "./constants/aa.constants";
import { EmailService } from "../../core/communication/services/email.service";
import { AwsPrivateS3Service } from "../../core/aws/s3/aws-private-s3.service";
import * as path from "path";
import * as ejs from "ejs";
import { AAConsentStatus } from "@prisma/client";
import { gzip } from "zlib";
import { promisify } from "util";

@Injectable()
export class AccountAggregatorService {
  private readonly logger = new Logger(AccountAggregatorService.name);
  private isDev = process.env.NODE_ENV !== "production";
  private readonly gzipAsync = promisify(gzip);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly awsPrivateS3Service: AwsPrivateS3Service,
  ) {}

  private sanitizeMobile(mobile: string): string {
    return mobile.replace(/^\+91/, ""); // remove +91 from start
  }

  async authenticate() {
    const body = {
      fiuID: AA_ENV.FIU_ID,
      redirection_key: AA_ENV.REDIRECTION_KEY,
      userId: AA_ENV.FIU_USER_ID,
    };
    // if (AA_ENV.LOG_HTTP)
    //   this.logger.debug(
    //     `[AA] Authentication → ${AA_ENV.FINDUIT_AUTHENTICATION_BASE_URL}/api/FIU/Authentication`
    //   );
    const { data } = await firstValueFrom(
      this.httpService.post(
        `${AA_ENV.FINDUIT_AUTHENTICATION_BASE_URL}/api/FIU/Authentication`,
        body,
        {
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    // if (AA_ENV.LOG_HTTP)
    //   this.logger.debug(`[AA] Auth OK: sessionId=${data.sessionId}`);

    return { token: data.token, sessionId: data.sessionId, raw: data };
  }

  async getRedirectUrl(params: {
    userId: string;
    clienttrnxid: string;
    manualPhoneNumber?: string;
  }) {
    // get user details from database
    if (!params.clienttrnxid) {
      throw new BadRequestException("clienttrnxid is required");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
    });
    if (!user) {
      throw new BadRequestException(`User not found for ID: ${params.userId}`);
    }
    const { token, sessionId } = await this.authenticate();
    if (!user.phoneNumber && !params.manualPhoneNumber) {
      throw new BadRequestException(
        `No mobile number found for user ID: ${params.userId}`,
      );
    }
    const body = {
      clienttrnxid: params.clienttrnxid ?? uuidv4(),
      fiuID: AA_ENV.FIU_ID,
      userId: AA_ENV.FIU_USER_ID,
      aaCustomerHandleId: params.manualPhoneNumber
        ? this.sanitizeMobile(params.manualPhoneNumber)
          ? `${this.sanitizeMobile(params.manualPhoneNumber)}@CAMSAA`
          : ""
        : user.phoneNumber
          ? `${this.sanitizeMobile(user.phoneNumber)}@CAMSAA`
          : "",
      aaCustomerMobile: params.manualPhoneNumber
        ? this.sanitizeMobile(params.manualPhoneNumber)
        : this.sanitizeMobile(user.phoneNumber) || "",
      sessionId,
      useCaseid: AA_ENV.USE_CASE_ID,
      fipid: "",
    };
    // if (AA_ENV.LOG_HTTP)
    //   this.logger.debug(
    //     `[AA] RedirectAA → ${FINDUIT_BASE_URL}/api/FIU/RedirectAA`
    //   );

    const { data } = await firstValueFrom(
      this.httpService.post(`${FINDUIT_BASE_URL}/api/FIU/RedirectAA`, body, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    // if (AA_ENV.LOG_HTTP)
    //   this.logger.debug(
    //     `[AA] RedirectURL OK for clienttxnid=${data.clienttxnid}`
    //   );

    return { redirectionurl: data.redirectionurl, response: data };
  }

  async createConsentRequest(params: { userId: string; brandId: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: params.userId,
      },
      include: {
        aa_consent_requests: {
          where: {
            consentStatus: { in: [AAConsentStatus.PENDING] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!user) {
      throw new BadRequestException(`User not found for ID: ${params.userId}`);
    }
    if (user.aa_consent_requests && user.aa_consent_requests.length > 0) {
      await this.prisma.aa_consent_requests.update({
        where: { id: user.aa_consent_requests[0].id },
        data: {
          retryCount: (user.aa_consent_requests[0].retryCount || 0) + 1,
          updatedAt: new Date(),
        },
      });

      return {
        consentRequestId: user.aa_consent_requests[0].id,
        clientTransactionId: user.aa_consent_requests[0].clientTransactionId,
        redirectionUrl: user.aa_consent_requests[0].redirectionUrl,
        consentHandle: user.aa_consent_requests[0].consentHandle,
      };
    }
    const clientTransactionId = uuidv4();
    const { redirectionurl, response } = await this.getRedirectUrl({
      userId: params.userId,
      clienttrnxid: clientTransactionId,
    });

    const consentRequest = await this.prisma.aa_consent_requests.create({
      data: {
        id: uuidv4(),
        userId: params.userId,
        brandId: params.brandId,
        clientTransactionId,
        aaCustomerHandleId: user.phoneNumber
          ? `${this.sanitizeMobile(user.phoneNumber)}@CAMSAA`
          : "",
        aaCustomerMobile: this.sanitizeMobile(user.phoneNumber) || "",
        consentHandle: response.consentHandle,
        redirectionUrl: redirectionurl,
        consentStatus: "PENDING",
        useCaseId: AA_ENV.USE_CASE_ID,
        sessionId: response.sessionId,
        txnId: response.txnid,
        updatedAt: new Date(),
      },
    });

    return {
      consentRequestId: consentRequest.id,
      clientTransactionId,
      redirectionUrl: redirectionurl,
      consentHandle: response.consentHandle,
    };
  }

  /**
   * Create manual consent request with custom handle ID and mobile
   */
  async createManualConsentRequest(params: {
    userId: string;
    mobile: string;
    brandId?: string;
  }) {
    // get user details from database
    const user = await this.prisma.user.findUnique({
      where: {
        id: params.userId,
      },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(`User not found for ID: ${params.userId}`);
    }

    // Validate mobile format (basic validation for 10 digits)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(params.mobile)) {
      throw new BadRequestException(
        "Invalid mobile number. Must be a 10-digit number starting with 6-9",
      );
    }

    const clientTransactionId = uuidv4();
    // Get redirect URL from AA provider
    const { redirectionurl, response } = await this.getRedirectUrl({
      userId: params.userId,
      clienttrnxid: clientTransactionId,
      manualPhoneNumber: params.mobile,
    });

    // Store consent request in database with manual data
    const consentRequest = await this.prisma.aa_consent_requests.create({
      data: {
        id: uuidv4(),
        userId: params.userId,
        brandId: params.brandId,
        clientTransactionId,
        aaCustomerHandleId: params.mobile
          ? `${this.sanitizeMobile(params.mobile)}@CAMSAA`
          : "",
        aaCustomerMobile: this.sanitizeMobile(params.mobile),
        consentHandle: response.consentHandle,
        redirectionUrl: redirectionurl,
        consentStatus: "PENDING",
        useCaseId: AA_ENV.USE_CASE_ID,
        sessionId: response.sessionId,
        txnId: response.txnid,
        updatedAt: new Date(),
      },
    });

    return {
      consentRequestId: consentRequest.id,
      clientTransactionId,
      redirectionUrl: redirectionurl,
      consentHandle: response.consentHandle,
    };
  }

  /**
   * Update consent status from webhook
   */
  async updateConsentStatus(params: {
    clientTransactionId: string;
    consentId: string;
    consentStatus: AAConsentStatus;
    consentHandle: string;
  }) {
    if (
      !params.clientTransactionId ||
      params.clientTransactionId === "undefined" ||
      params.clientTransactionId.trim() === ""
    ) {
      throw new BadRequestException("Valid clientTransactionId is required");
    }
    if (!params.clientTransactionId) {
      throw new BadRequestException("clientTransactionId is required");
    }
    const consentRequest = await this.prisma.aa_consent_requests.findUnique({
      where: { clientTransactionId: params.clientTransactionId },
    });

    if (!consentRequest) {
      throw new BadRequestException(
        `Consent request not found for clientTransactionId: ${params.clientTransactionId}`,
      );
    }

    const updateData: {
      consentStatus: AAConsentStatus;
      consentId: string;
      updatedAt: Date;
      approvedAt?: Date;
      rejectedAt?: Date;
      revokedAt?: Date;
    } = {
      consentStatus: params.consentStatus,
      consentId: params.consentId,
      updatedAt: new Date(),
    };

    if (params.consentStatus === "ACTIVE") {
      updateData.approvedAt = new Date();
    } else if (params.consentStatus === "REJECTED") {
      updateData.rejectedAt = new Date();
    } else if (params.consentStatus === "REVOKED") {
      updateData.revokedAt = new Date();
    }

    return this.prisma.aa_consent_requests.update({
      where: { id: consentRequest.id },
      data: updateData,
    });
  }

  /**
   * Store data received from webhook
   */
  async storeDataSession(params: {
    clientTransactionId: string;
    fipId: string;
    fipName?: string;
    maskedAccountNumber?: string;
    accRefNumber?: string;
    dataType: string;
    rawData: any;
    pdfData?: string;
    jsonData?: any;
    xmlData?: string;
    csvData?: string;
    reportData?: string;
  }) {
    if (!params.clientTransactionId) {
      throw new BadRequestException("clientTransactionId is required");
    }
    const consentRequest = await this.prisma.aa_consent_requests.findUnique({
      where: { clientTransactionId: params.clientTransactionId },
    });

    if (!consentRequest) {
      throw new BadRequestException(
        `Consent request not found for clientTransactionId: ${params.clientTransactionId}`,
      );
    }

    let aaPdfKey: string | undefined;
    let aaReportKey: string | undefined;
    let aaJsonGzKey: string | undefined;

    try {
      if (params.pdfData) {
        const pdfBuffer = Buffer.from(params.pdfData, "base64");
        aaPdfKey = await this.awsPrivateS3Service.uploadPrivatePdfToS3(
          pdfBuffer,
          consentRequest.brandId || "",
          consentRequest.userId,
          uuidv4(),
          "ACCOUNT_AGGREGATOR",
          `aa_pdf_${Date.now()}.pdf`,
        );
      }

      if (params.reportData) {
        const reportBuffer = Buffer.from(params.reportData, "base64");
        aaReportKey = await this.awsPrivateS3Service.uploadPrivatePdfToS3(
          reportBuffer,
          consentRequest.brandId || "",
          consentRequest.userId,
          uuidv4(),
          "ACCOUNT_AGGREGATOR",
          `aa_report_${Date.now()}.xlsx`,
        );
      }

      // Compress and upload complete response as JSON.GZ
      try {
        const gzipBuffer = await this.gzipAsync(
          JSON.stringify(params.rawData),
        );
        const result = await this.awsPrivateS3Service.uploadPrivateDocument(
          {
            buffer: gzipBuffer,
            originalname: `aa-data-${consentRequest.userId}-${Date.now()}.json.gz`,
            mimetype: "application/gzip",
            size: gzipBuffer.length,
            fieldname: "file",
            encoding: "7bit",
            stream: null,
            destination: "",
            filename: `aa-data-${consentRequest.userId}-${Date.now()}.json.gz`,
            path: "",
          } as Express.Multer.File,
          consentRequest.brandId || "",
          consentRequest.userId,
          uuidv4(),
          "ACCOUNT_AGGREGATOR",
        );
        aaJsonGzKey = result.key;
        this.logger.log(
          `AA JSON.GZ uploaded for user ${consentRequest.userId}. Key: ${aaJsonGzKey}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to upload AA JSON.GZ for user ${consentRequest.userId}: ${err.message}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${error.message}`);
    }

    return this.prisma.aa_data_sessions.create({
      data: {
        id: uuidv4(),
        consentRequestId: consentRequest.id,
        clientTransactionId: params.clientTransactionId,
        fipId: params.fipId,
        fipName: params.fipName,
        maskedAccountNumber: params.maskedAccountNumber,
        accRefNumber: params.accRefNumber,
        dataType: params.dataType,
        rawData: params.rawData,
        pdfData: params.pdfData,
        aa_pdf_key: aaPdfKey,
        jsonData: params.jsonData,
        xmlData: params.xmlData,
        csvData: params.csvData,
        reportData: params.reportData,
        aa_report_key: aaReportKey,
        aa_json_gz_key: aaJsonGzKey,
        status: "RECEIVED",
        updatedAt: new Date(),
        receivedAt: new Date(),
      },
    });
  }

  /**
   * Get consent request by ID
   */
  async getConsentRequest(id: string) {
    if (!id) {
      throw new BadRequestException("Consent request ID is required");
    }
    return this.prisma.aa_consent_requests.findUnique({
      where: { id },
      include: {
        aa_data_sessions: true,
        users: {
          include: {
            userDetails: true,
          },
        },
      },
    });
  }

  /**
   * Get consent requests for a user
   */
  async getUserConsentRequests(userId: string) {
    return this.prisma.aa_consent_requests.findMany({
      where: { userId },
      include: {
        aa_data_sessions: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get data sessions for a consent request
   */
  async getDataSessions(consentRequestId: string) {
    return this.prisma.aa_data_sessions.findMany({
      where: { consentRequestId },
      orderBy: { createdAt: "desc" },
    });
  }
  async sendConsentRequestEmail(userId: string): Promise<boolean> {
    try {
      // Get user details with brand information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userDetails: true,
          brand: {
            include: {
              brandDetails: true,
              brand_themes: true,
            },
          },
        },
      });

      if (!user) {
        return false;
      }

      if (!user.email) {
        return false;
      }

      // Create consent request to get the URL
      let consentData;
      try {
        consentData = await this.createConsentRequest({
          userId,
          brandId: user.brandId,
        });
      } catch (error) {
        return false;
      }

      if (!consentData?.redirectionUrl) {
        // this.logger.error(`Consent URL missing for user ${userId}`);
        return false;
      }

      // Prepare dynamic template data
      const userName =
        user.userDetails?.firstName ||
        user.email.split("@")[0] ||
        "Valued Customer";

      const brandName = user.brand?.name || "";
      const brandLogo = user.brand?.logoUrl || null;
      const brandPrimaryColor =
        user.brand?.brand_themes?.primaryColor || "#007bff";
      const brandSecondaryColor =
        user.brand?.brand_themes?.secondaryColor || "#0056b3";
      const supportEmail = user.brand?.brandDetails?.contactEmail || "";
      const supportPhone = user.brand?.brandDetails?.contactPhone || null;
      const brandWebsite = user.brand?.brandDetails?.website || null;
      let templatePath: string;
      try {
        const templateName = "aa-consent-request";
        templatePath = path.join(
          process.cwd(),
          this.isDev ? "src" : "src",
          "templates",
          "web",
          "ejs",
          `${templateName}.ejs`,
        );
      } catch (error) {
        // this.logger.error("Failed to resolve template path:", error);
        return false;
      }

      let htmlContent: string;
      try {
        htmlContent = await ejs.renderFile(templatePath, {
          userName,
          consentUrl: consentData.redirectionUrl,
          brandName,
          brandLogo,
          brandPrimaryColor,
          brandSecondaryColor,
          supportEmail,
          supportPhone,
          brandWebsite,
          currentYear: new Date().getFullYear(),
        });
        // this.logger.log(
        //   `✅ EJS template rendered successfully - Content length: ${htmlContent.length} characters`
        // );
      } catch (err) {
        // this.logger.error(`Failed to render email template: ${err}`);
        return false;
      }

      const emailResult = await this.emailService.sendEmail({
        to: user.email,
        name: userName,
        subject: `Action Required: Your ${brandName} Account Aggregator Consent Request`,
        html: htmlContent,
      });

      if (emailResult) {
        try {
          await this.prisma.aa_consent_requests.update({
            where: { id: consentData.consentRequestId },
            data: {
              retryCount: {
                increment: 1,
              },
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          this.logger.warn(
            `Failed to update retry count for consent ${consentData.consentRequestId}:`,
            error,
          );
        }
        return true;
      } else {
        this.logger.error(
          `❌ Failed to send AA consent email to user ${userId} (${user.email})`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Unexpected error sending AA consent email to user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Store consent notification from webhook
   */
  async storeConsentNotification(params: {
    clientTransactionId: string;
    txnId: string;
    consentId: string;
    consentHandle: string;
    consentStatus: AAConsentStatus;
    fetchType: string;
    frequency: string;
    consentStartDate: string | Date;
    consentEndDate: string | Date;
    notifierId?: string;
    notifierType?: string;
    timestamp: string | Date;
    purpose: string;
    rawData?: any;
  }) {
    if (!params.clientTransactionId) {
      throw new BadRequestException("clientTransactionId is required");
    }
    const consentRequest = await this.prisma.aa_consent_requests.findUnique({
      where: { clientTransactionId: params.clientTransactionId },
    });

    if (!consentRequest) {
      throw new BadRequestException(
        `Consent request not found for clientTransactionId: ${params.clientTransactionId}`,
      );
    }

    return this.prisma.aa_consent_notifications.create({
      data: {
        id: uuidv4(),
        consentRequestId: consentRequest.id,
        txnId: params.txnId,
        consentId: params.consentId,
        consentHandle: params.consentHandle,
        consentStatus: params.consentStatus,
        fetchType: params.fetchType,
        frequency: params.frequency,
        consentStartDate: new Date(params.consentStartDate),
        consentEndDate: new Date(params.consentEndDate),
        notifierId: params.notifierId,
        notifierType: params.notifierType,
        timestamp: new Date(params.timestamp),
        purpose: params.purpose,
        rawData: params.rawData,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Fetch periodic financial data from Finduit API
   * Rate limiting: Once every 24 hours and max 5 times per month
   */
  async fetchPeriodicData(params: {
    userId: string;
    consentRequestId: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new BadRequestException(`User not found for ID: ${params.userId}`);
    }

    if (!params.consentRequestId) {
      throw new BadRequestException("clientTransactionId is required");
    }
    // Get consent request from database
    const consentRequest = await this.prisma.aa_consent_requests.findUnique({
      where: { id: params.consentRequestId },
    });

    if (!consentRequest) {
      throw new BadRequestException(
        `Consent request not found for ID: ${params.consentRequestId}`,
      );
    }

    if (consentRequest.consentStatus !== "ACTIVE") {
      throw new BadRequestException(
        `Consent request is not ACTIVE for ID: ${params.consentRequestId}`,
      );
    }

    if (consentRequest.userId !== params.userId) {
      throw new BadRequestException(
        `Consent request does not belong to user ${params.userId}`,
      );
    }

    // Rate limiting: Check 24-hour limit
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastRequestInDay =
      await this.prisma.aa_periodic_data_responses.findFirst({
        where: {
          consentRequestId: params.consentRequestId,
          createdAt: {
            gte: oneDayAgo,
          },
        },
        orderBy: { createdAt: "desc" },
      });

    if (lastRequestInDay) {
      const nextAvailableTime = new Date(
        lastRequestInDay.createdAt.getTime() + 24 * 60 * 60 * 1000,
      );
      throw new BadRequestException(
        `Rate limit exceeded. You can fetch periodic data once every 24 hours. Next available at: ${nextAvailableTime.toISOString()}`,
      );
    }

    // Rate limiting: Check monthly limit (5 times per month)
    const currentDate = new Date();
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const monthlyRequestCount =
      await this.prisma.aa_periodic_data_responses.count({
        where: {
          consentRequestId: params.consentRequestId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

    if (monthlyRequestCount >= 5) {
      throw new BadRequestException(
        `Monthly limit exceeded. You can fetch periodic data a maximum of 5 times per month. Requests this month: ${monthlyRequestCount}/5`,
      );
    }

    // Get authentication token
    const { token } = await this.authenticate();

    // Use defaults from constants and consentId from database
    const txnId = AA_ENV.TXN_ID;
    const fiuID = AA_ENV.FIU_ID;
    const sessionId = AA_ENV.SESSION_ID;
    const consentId = consentRequest.consentId;

    const body = {
      sessionId,
      txnId,
      consentId,
      fiuID,
    };

    if (AA_ENV.LOG_HTTP)
      this.logger.debug(
        `[AA] FetchPeriodicData → ${FINDUIT_BASE_URL}/api/FIData/v2/FetchPeriodicData`,
      );

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${FINDUIT_BASE_URL}/api/FIData/v2/FetchPeriodicData`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      if (AA_ENV.LOG_HTTP) {
        this.logger.debug(
          `[AA] FetchPeriodicData OK for userId=${params.userId}`,
        );
      }

      // Store the response in aa_periodic_data_responses table
      await this.prisma.aa_periodic_data_responses.create({
        data: {
          id: uuidv4(),
          txnId: data.txnId,
          statusCode: data.statusCode,
          statusMessage: data.statusMessage,
          referenceId: data.reference_id,
          dataSessionId: data.dataSessionId,
          rawData: data,
          updatedAt: new Date(),
          aa_consent_request: {
            connect: { id: params.consentRequestId },
          },
        },
      });

      if (AA_ENV.LOG_HTTP) {
        this.logger.debug(
          `[AA] FetchPeriodicData response stored in aa_periodic_data_responses`,
        );
      }

      return {
        success: true,
        data,
        meta: {
          userId: params.userId,
          timestamp: new Date(),
          dataSessionId: data.dataSessionId,
        },
      };
    } catch (error) {
      this.logger.error(
        `[AA] FetchPeriodicData failed for userId=${params.userId}:`,
        error,
      );
      throw new BadRequestException(`Failed to fetch periodic data`);
    }
  }
}

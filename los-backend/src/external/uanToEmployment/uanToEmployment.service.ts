import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { PrismaService } from "src/prisma/prisma.service";
import { firstValueFrom } from "rxjs";
import {
  BrandProviderType,
  BrandProviderName,
  UanToEmploymentStatus,
  DocumentTypeEnum,
} from "@prisma/client";
import {
  UanToEmploymentRequest,
  UanToEmploymentResponse,
  SignzyUanToEmploymentRequest,
  SignzyUanToEmploymentResponse,
  KycKartUanToEmploymentResponse,
  DigitapMobileToEmploymentResponse,
} from "./interfaces/uan-to-employment.interface";
import { PhoneToUanService } from "../phoneToUan/phoneToUan.service";
import { ConfigService } from "@nestjs/config";
import * as dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

export interface GetUanAndHistoryOptions {
  cacheOnly?: boolean;
}

const _dayjs = dayjs.default;
@Injectable()
export class UanToEmploymentService {
  private readonly logger = new Logger(UanToEmploymentService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly phoneToUanService: PhoneToUanService,
    private readonly configService: ConfigService,
  ) {}

  private parseFlexibleDate(value: any): Date | null {
    if (!value) return null;

    const str = String(value).trim();
    if (!str || str === "-" || str.toUpperCase() === "N/A") return null;

    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }

    const ddmmmyyyyMatch = str.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/i);
    if (ddmmmyyyyMatch) {
      const monthMap: { [key: string]: number } = {
        JAN: 0,
        FEB: 1,
        MAR: 2,
        APR: 3,
        MAY: 4,
        JUN: 5,
        JUL: 6,
        AUG: 7,
        SEP: 8,
        OCT: 9,
        NOV: 10,
        DEC: 11,
      };
      const day = parseInt(ddmmmyyyyMatch[1], 10);
      const monthStr = ddmmmyyyyMatch[2].toUpperCase();
      const year = parseInt(ddmmmyyyyMatch[3], 10);
      const month = monthMap[monthStr];

      if (month !== undefined) {
        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? null : date;
      }
    }

    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  }

  private formatDateToDDMMYYYY(d: Date | null): string | null {
    if (!d) return null;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear());
    return `${day}/${month}/${year}`;
  }

  private normalizeString(value: any): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (
      !str ||
      str === "-" ||
      str.toUpperCase() === "N/A" ||
      str.toUpperCase() === "NA"
    )
      return null;
    return str;
  }

  private transformEmploymentData(historyItem: any, employeeDetails: any): any {
    const establishmentName = this.normalizeString(
      historyItem.establishment_name ||
        historyItem.establishmentName ||
        historyItem.employer_name ||
        historyItem.employerName,
    );

    const customerName = this.normalizeString(
      historyItem.name || historyItem.customerName || employeeDetails?.name,
    );

    const memberId = this.normalizeString(
      historyItem.member_id || historyItem.memberId || historyItem.member,
    );

    const rawJoin =
      historyItem.date_of_joining ||
      historyItem.dateOfJoining ||
      historyItem.joinDate ||
      historyItem.joiningDate ||
      historyItem.date;

    const rawExit =
      historyItem.date_of_exit ||
      historyItem.dateOfExit ||
      historyItem.exitDate ||
      historyItem.exit_of;

    const joinDateObj = this.parseFlexibleDate(rawJoin);
    const exitDateObj = this.parseFlexibleDate(rawExit);

    const joiningDate = this.formatDateToDDMMYYYY(joinDateObj);
    const exitDate = this.formatDateToDDMMYYYY(exitDateObj);

    const guardianName = this.normalizeString(
      historyItem.guardian_name ||
        historyItem.guardianName ||
        historyItem.fatherOrHusbandName ||
        historyItem.fatherName ||
        employeeDetails?.fatherName ||
        employeeDetails?.fatherOrHusbandName,
    );

    const uan = this.normalizeString(
      historyItem.uan || historyItem.uanNumber || employeeDetails?.uan,
    );

    return {
      establishmentName,
      customerName,
      memberId,
      joiningDate,
      exitDate,
      guardianName,
      uan,
      joiningDateObj: joinDateObj,
      exitDateObj: exitDateObj,
      establishment_name: establishmentName,
      name: customerName,
      member_id: memberId,
      date_of_joining: joiningDate,
      date_of_exit: exitDate,
      guardian_name: guardianName,
      uanNumber: uan,
    };
  }

  // Add this method in the UanToEmploymentService class
  private generateClientRefNum(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `ref_${timestamp}_${random}`.substring(0, 45);
  }

  private async getActiveUanToEmploymentProvider(brandId: string) {
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.UAN_TO_EMPLOYMENT,
        isActive: true,
        isDisabled: false,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    if (providers.length === 0) {
      throw new HttpException(
        "No active UAN to employment provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const primaryProvider = providers.find((p) => p.isPrimary);
    return primaryProvider || providers[0];
  }

  async getEmploymentHistoryByUan(
    brandId: string,
    request: UanToEmploymentRequest,
    userId?: string,
  ): Promise<UanToEmploymentResponse> {
    const provider = await this.getActiveUanToEmploymentProvider(brandId);

    this.logger.log(
      `Using ${provider.provider} for UAN to employment lookup (Brand: ${brandId})`,
    );

    let response: UanToEmploymentResponse;
    let status: UanToEmploymentStatus = UanToEmploymentStatus.FAILED;

    try {
      switch (provider.provider) {
        case BrandProviderName.SIGNZY:
          response = await this.getEmploymentHistoryWithSignzy(request);
          break;
        case BrandProviderName.KYCKART:
          response = await this.getEmploymentHistoryWithKycKart(request);
          break;
        case BrandProviderName.DIGITAP:
          response = await this.getEmploymentHistoryWithDigitap(request);
          break;
        default:
          throw new HttpException(
            `Unsupported UAN to employment provider: ${provider.provider}`,
            HttpStatus.NOT_IMPLEMENTED,
          );
      }

      status = response.success
        ? UanToEmploymentStatus.SUCCESS
        : UanToEmploymentStatus.FAILED;

      await this.logUanToEmploymentRequest({
        userId,
        brandId,
        uan: request.uan,
        provider: provider.provider,
        status,
        request,
        response,
        errorMessage: null,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `UAN to employment failed with ${provider.provider}: ${error.message}`,
        error.stack,
      );

      await this.logUanToEmploymentRequest({
        userId,
        brandId,
        uan: request.uan,
        provider: provider.provider,
        status: UanToEmploymentStatus.FAILED,
        request,
        response: null,
        errorMessage: error.message || "Unknown error",
      });

      throw error;
    }
  }

  private async logUanToEmploymentRequest(logData: {
    userId?: string;
    brandId: string;
    uan: string;
    provider: BrandProviderName;
    status: UanToEmploymentStatus;
    request: any;
    response: any;
    errorMessage?: string;
  }) {
    try {
      const data: any = {
        uan: logData.uan || "N/A",
        provider: logData.provider,
        status: logData.status,
        request: logData.request,
        response: logData.response || {},
        errorMessage: logData.errorMessage,
      };

      // Add brand relation if brandId is provided
      if (logData.brandId) {
        data.brand = {
          connect: { id: logData.brandId },
        };
      }

      // Add user relation if userId is provided
      if (logData.userId) {
        data.user = {
          connect: { id: logData.userId },
        };
      }

      await this.prisma.uan_to_employment_log.create({
        data,
      });
    } catch (error) {
      this.logger.error("Failed to log UAN to employment request:", error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  private async getEmploymentHistoryWithSignzy(
    request: UanToEmploymentRequest,
  ): Promise<UanToEmploymentResponse> {
    const url =
      "https://api.signzy.app/api/v3/underwriting/fetch-employment-history";
    const authToken = this.configService.get<string>(
      "SIGNZY_UAN_TO_EMPLOYMENT_AUTH_TOKEN",
    );

    if (!authToken) {
      throw new HttpException(
        "Signzy UAN to employment configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: SignzyUanToEmploymentRequest = {
      uan: request.uan,
      ...(request.pan && { pan: request.pan }),
      ...(request.mobile && {
        mobile:
          // remove +91 if present
          request.mobile.startsWith("+91")
            ? request.mobile.slice(3)
            : request.mobile,
      }),
      ...(request.dob && {
        dob: _dayjs(request.dob, "DD-MM-YYYY").format("YYYY-MM-DD"),
      }),
      ...(request.employeeName && { employeeName: request.employeeName }),
    };

    try {
      this.logger.log(`Making Signzy employment history API call to: ${url}`);
      this.logger.debug(`Signzy employment request payload:`, payload);

      const { data } = await firstValueFrom(
        this.httpService.post<SignzyUanToEmploymentResponse>(url, payload, {
          headers: {
            Authorization: authToken,
            "Content-Type": "application/json",
          },
          timeout: 45000,
        }),
      );

      this.logger.debug(
        "Signzy employment raw response:",
        JSON.stringify(data, null, 2),
      );

      const hasEmploymentData =
        data.result && Array.isArray(data.result) && data.result.length > 0;
      const isSuccess = hasEmploymentData;

      const employmentHistory = hasEmploymentData
        ? data.result.map((emp) => ({
            establishment_name: emp.establishmentName || null,
            establishmentName: emp.establishmentName || null,
            name: emp.name || null,
            customerName: emp.name || null,
            guardian_name: emp.fatherOrHusbandName || null,
            guardianName: emp.fatherOrHusbandName || null,
            fatherOrHusbandName: emp.fatherOrHusbandName || null,
            member_id: emp.memberId || null,
            memberId: emp.memberId || null,
            date_of_joining: emp.dateOfJoining || null,
            dateOfJoining: emp.dateOfJoining || null,
            joinDate: emp.dateOfJoining || null,
            date_of_exit: emp.dateOfExit || null,
            dateOfExit: emp.dateOfExit || null,
            exitDate: emp.dateOfExit || null,
            uan: emp.uan || request.uan,
            uanNumber: emp.uan || request.uan,
            establishmentId: emp.establishmentId || null,
            tenureOfEmployment: emp.tenureOfEmployment || null,
          }))
        : [];

      const firstRecord = data.result?.[0];
      const basicDetails =
        data.additionalDetails?.uanDetails?.[0]?.[firstRecord?.uan]
          ?.basicDetails;

      const employeeDetails = firstRecord
        ? {
            name: firstRecord.name,
            customerName: firstRecord.name,
            fatherName: firstRecord.fatherOrHusbandName,
            fatherOrHusbandName: firstRecord.fatherOrHusbandName,
            guardian_name: firstRecord.fatherOrHusbandName,
            guardianName: firstRecord.fatherOrHusbandName,
            dateOfBirth: basicDetails?.dateOfBirth
              ? _dayjs(basicDetails.dateOfBirth).format("DD-MM-YYYY")
              : null,
            uan: firstRecord.uan || request.uan,
            uanNumber: firstRecord.uan || request.uan,
            pan: null,
            gender: basicDetails?.gender || null,
            mobile: basicDetails?.mobile || null,
          }
        : {};

      return {
        success: isSuccess,
        employmentHistory,
        employeeDetails,
        message: isSuccess
          ? "Employment history fetch successful"
          : "Employment history fetch failed",
        provider: "SIGNZY",
        raw: data,
      };
    } catch (error) {
      this.logger.error("Signzy UAN to employment error:", {
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

      if (error?.response?.status === 401) {
        throw new HttpException(
          "Signzy authentication failed - invalid or expired token",
          HttpStatus.UNAUTHORIZED,
        );
      } else if (error?.response?.status === 400) {
        throw new HttpException(
          error.response?.data?.message ||
            "Invalid request parameters for Signzy",
          HttpStatus.BAD_REQUEST,
        );
      } else if (error?.response?.status === 429) {
        throw new HttpException(
          "Signzy API rate limit exceeded",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        error.response?.data?.message ||
          "Signzy UAN to employment lookup failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getEmploymentHistoryWithKycKart(
    request: UanToEmploymentRequest,
  ): Promise<UanToEmploymentResponse> {
    const url =
      "https://api.kyckart.com/api/epfo/employment-history/fetch-by-uan-v6";
    const apiKey = this.configService.get<string>("KYCKART_API_KEY");

    if (!apiKey) {
      throw new HttpException(
        "KycKart UAN to employment configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("uan", request.uan);
    formData.append("groupId", request.groupId || "defaultGroupId");
    formData.append("checkId", request.checkId || "defaultCheckId");

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<KycKartUanToEmploymentResponse>(url, formData, {
          headers: {
            "x-api-key": apiKey,
            ...formData.getHeaders(),
          },
        }),
      );

      const hasEmploymentData =
        data.response &&
        Array.isArray(data.response) &&
        data.response.length > 0;
      const isSuccess = data.status?.statusCode === 200 && hasEmploymentData;

      const employmentHistory = hasEmploymentData
        ? data.response.map((emp) => ({
            establishment_name: emp.establishment_name || null,
            establishmentName: emp.establishment_name || null,
            name: emp.name || null,
            customerName: emp.name || null,
            guardian_name: emp.guardian_name || null,
            guardianName: emp.guardian_name || null,
            fatherOrHusbandName: emp.guardian_name || null,
            member_id: emp.member_id || null,
            memberId: emp.member_id || null,
            date_of_joining: emp.date_of_joining || null,
            dateOfJoining: emp.date_of_joining || null,
            joinDate: emp.date_of_joining || null,
            date_of_exit: emp.date_of_exit === "-" ? null : emp.date_of_exit,
            dateOfExit: emp.date_of_exit === "-" ? null : emp.date_of_exit,
            exitDate: emp.date_of_exit === "-" ? null : emp.date_of_exit,
            uan: emp.uan || request.uan,
            uanNumber: emp.uan || request.uan,
          }))
        : [];

      const firstRecord = data.response?.[0];
      const employeeDetails = firstRecord
        ? {
            name: firstRecord.name,
            customerName: firstRecord.name,
            fatherName: firstRecord.guardian_name,
            fatherOrHusbandName: firstRecord.guardian_name,
            guardian_name: firstRecord.guardian_name,
            guardianName: firstRecord.guardian_name,
            dateOfBirth: null,
            uan: firstRecord.uan || request.uan,
            uanNumber: firstRecord.uan || request.uan,
            pan: null,
          }
        : {};

      return {
        success: isSuccess,
        employmentHistory,
        employeeDetails,
        message:
          data.status?.statusMessage ||
          (isSuccess
            ? "Employment history fetch successful"
            : "Employment history fetch failed"),
        provider: "KYCKART",
        raw: data,
      };
    } catch (error) {
      this.logger.error(
        "KycKart UAN to employment error:",
        error.response?.data,
      );
      throw new HttpException(
        error.response?.data?.message ||
          "KycKart UAN to employment lookup failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEmploymentHistoryWithDigitap(
    request: UanToEmploymentRequest,
  ): Promise<UanToEmploymentResponse> {
    const url = "https://svc.digitap.ai/cv/v4/uan_basic/sync";
    const authKey = this.configService.get<string>(
      "DIGITAP_UAN_TO_EMPLOYMENT_AUTH_KEY",
    );

    if (!authKey) {
      throw new HttpException(
        "Digitap mobile to employment configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: any = {
      client_ref_num: this.generateClientRefNum(),
    };

    // Add mobile if available
    if (request.mobile) {
      const mobileDigits = request.mobile.replace(/\D/g, "");
      if (mobileDigits.length === 10) {
        payload.mobile = mobileDigits;
      } else {
        throw new Error("Mobile must be exactly 10 numerical digits");
      }
    }

    // Add PAN if available
    if (request.pan) {
      payload.pan = request.pan;
    }

    // Add UAN if available
    if (request.uan) {
      payload.uan = request.uan;
    }

    // Add other optional fields
    if (request.dob) {
      payload.dob = _dayjs(request.dob, "DD-MM-YYYY").format("YYYY-MM-DD");
    }

    if (request.employeeName) {
      payload.employee_name = request.employeeName;
    }

    try {
      this.logger.debug(`Making Digitap API call with payload:`, payload);

      const { data } = await firstValueFrom(
        this.httpService.post<DigitapMobileToEmploymentResponse>(url, payload, {
          headers: {
            "Content-Type": "application/json",
            authorization: `Basic ${authKey}`,
          },
        }),
      );

      this.logger.debug("Digitap API response received");

      const isApiSuccess = data.http_response_code === 200;

      // Check if we have uan_details in the response
      const hasUanDetails =
        data.result?.uan_details &&
        Object.keys(data.result.uan_details).length > 0;

      // Check if any uan_detail has employment_history
      let hasEmploymentHistory = false;
      let uanKey = null;
      let employmentHistory = [];
      let employeeDetails = {};

      if (hasUanDetails) {
        // Get the first UAN key
        const uanKeys = Object.keys(data.result.uan_details);
        uanKey = uanKeys.length > 0 ? uanKeys[0] : null;

        if (uanKey) {
          const uanData = data.result.uan_details[uanKey];

          // Check for employment_history array
          if (
            uanData.employment_history &&
            Array.isArray(uanData.employment_history)
          ) {
            hasEmploymentHistory = uanData.employment_history.length > 0;

            // Map employment history
            employmentHistory = uanData.employment_history.map((emp: any) => ({
              establishment_name: emp.establishment_name || null,
              establishmentName: emp.establishment_name || null,
              name: uanData.basic_details?.name || null,
              customerName: uanData.basic_details?.name || null,
              guardian_name: null,
              guardianName: null,
              fatherOrHusbandName: null,
              member_id: emp.member_id || null,
              memberId: emp.member_id || null,
              date_of_joining: emp.date_of_joining || null,
              dateOfJoining: emp.date_of_joining || null,
              joinDate: emp.date_of_joining || null,
              date_of_exit: emp.date_of_exit || null,
              dateOfExit: emp.date_of_exit || null,
              exitDate: emp.date_of_exit || null,
              uan: uanKey,
              uanNumber: uanKey,
            }));
          }

          // Get employee details
          if (uanData.basic_details) {
            employeeDetails = {
              name: uanData.basic_details.name || null,
              customerName: uanData.basic_details.name || null,
              fatherName: null,
              fatherOrHusbandName: null,
              guardian_name: null,
              guardianName: null,
              dateOfBirth: uanData.basic_details.date_of_birth || null,
              uan: uanKey,
              uanNumber: uanKey,
              pan: request.pan || null,
              gender: uanData.basic_details.gender || null,
              mobile: uanData.basic_details.mobile || null,
              aadhaar_verification_status:
                uanData.basic_details.aadhaar_verification_status || null,
              is_employed: data.result?.summary?.is_employed || false,
              establishment_name:
                uanData.employment_details?.establishment_name || null,
              date_of_joining:
                uanData.employment_details?.date_of_joining || null,
              date_of_exit: uanData.employment_details?.date_of_exit || null,
              member_id: uanData.employment_details?.member_id || null,
              establishment_id:
                uanData.employment_details?.establishment_id || null,
              leave_reason: uanData.employment_details?.leave_reason || null,
            };
          }
        }
      }

      // Success if API call succeeded AND we have employment data
      const isSuccess =
        isApiSuccess && data.result_code === 101 && hasEmploymentHistory;

      this.logger.debug(`Digitap result:`, {
        isApiSuccess,
        result_code: data.result_code,
        hasUanDetails,
        hasEmploymentHistory,
        employmentCount: employmentHistory.length,
        isSuccess,
      });

      const message = isSuccess
        ? "Employment history fetch successful"
        : hasUanDetails
          ? "Found UAN but no employment history"
          : "No employment data found";

      return {
        success: isSuccess,
        employmentHistory,
        employeeDetails,
        message,
        provider: "DIGITAP",
        raw: data,
      };
    } catch (error) {
      this.logger.error("Digitap mobile to employment error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      throw new HttpException(
        error.response?.data?.message ||
          "Digitap mobile UAN to employment lookup failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEmploymentHistoryWithDigitapByPan(
    brandId?: string,
    userId?: string,
  ): Promise<UanToEmploymentResponse> {
    if (!userId) {
      throw new HttpException(
        "User ID is required to fetch PAN from database",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 1: Fetch PAN from database
    let panFromDb: string | null = null;
    try {
      const panDocument = await this.prisma.document.findFirst({
        where: {
          userId,
          type: "PAN" as DocumentTypeEnum, // Use your actual enum value
        },
        select: {
          documentNumber: true,
        },
      });

      if (!panDocument || !panDocument.documentNumber) {
        throw new HttpException(
          "PAN not found in database. Please upload PAN document first.",
          HttpStatus.NOT_FOUND,
        );
      }

      panFromDb = panDocument.documentNumber;
      this.logger.log(
        `Retrieved PAN from database for user ${userId}: ${panFromDb.substring(0, 4)}****`,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch PAN from database: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Create request object from the PAN fetched from DB
    const request: UanToEmploymentRequest = {
      pan: panFromDb,
      // Note: dob and employeeName might not be available from DB
      // You might need to fetch these from user profile if needed
    };

    // Check cache first - fetch ALL records for this user
    if (userId) {
      try {
        const cachedData = await this.prisma.previous_employments.findMany({
          where: {
            userId,
            uanNumber: { not: null },
          },
          orderBy: {
            joiningDate: "desc",
          },
        });

        if (cachedData.length > 0) {
          this.logger.log(
            `Returning ${cachedData.length} cached employment records for user ${userId} based on PAN`,
          );

          const employmentHistory = cachedData.map((cachedRecord) => ({
            establishmentName: cachedRecord.establishmentName,
            customerName: cachedRecord.customerName,
            memberId: cachedRecord.memberId,
            joiningDate: cachedRecord.joiningDate
              ? this.formatDateToDDMMYYYY(cachedRecord.joiningDate)
              : null,
            exitDate: cachedRecord.exitDate
              ? this.formatDateToDDMMYYYY(cachedRecord.exitDate)
              : null,
            guardianName: cachedRecord.guardianName,
            uan: cachedRecord.uanNumber,
            establishment_name: cachedRecord.establishmentName,
            name: cachedRecord.customerName,
            member_id: cachedRecord.memberId,
            date_of_joining: cachedRecord.joiningDate
              ? this.formatDateToDDMMYYYY(cachedRecord.joiningDate)
              : null,
            date_of_exit: cachedRecord.exitDate
              ? this.formatDateToDDMMYYYY(cachedRecord.exitDate)
              : null,
            guardian_name: cachedRecord.guardianName,
            uanNumber: cachedRecord.uanNumber,
          }));

          // Get the most recent record for employee details
          const mostRecentRecord = cachedData[0];

          return {
            success: true,
            employmentHistory,
            employeeDetails: {
              name: mostRecentRecord.customerName,
              uan: mostRecentRecord.uanNumber,
              pan: panFromDb, // Use PAN from DB
            },
            message: `Employment history retrieved from cache (${cachedData.length} records)`,
            provider: "DIGITAP",
            raw: { fromCache: true },
          };
        }
      } catch (cacheError) {
        this.logger.warn(
          `Cache lookup failed for PAN ${panFromDb}: ${cacheError.message}`,
        );
      }
    }

    // If not in cache, call Digitap API
    const url = "https://svc.digitap.ai/cv/v4/uan_basic/sync";
    const authKey = this.configService.get<string>(
      "DIGITAP_UAN_TO_EMPLOYMENT_AUTH_KEY",
    );

    if (!authKey) {
      throw new HttpException(
        "Digitap UAN to employment configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: any = {
      client_ref_num: this.generateClientRefNum(),
      pan: panFromDb, // Use PAN from DB
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DigitapMobileToEmploymentResponse>(url, payload, {
          headers: {
            "Content-Type": "application/json",
            authorization: `Basic ${authKey}`,
          },
        }),
      );

      const isApiSuccess = data.http_response_code === 200;
      const hasEmploymentData =
        data.result_code === 101 &&
        data.result?.uan_details &&
        Object.keys(data.result.uan_details).length > 0;

      const isSuccess = isApiSuccess && hasEmploymentData;

      const uanKeys = Object.keys(data.result?.uan_details || {});
      const uanKey = uanKeys.length > 0 ? uanKeys[0] : null;

      // Get employment history - check both employment_history array and employment_details
      let employmentHistory = [];

      if (uanKey && data.result?.uan_details[uanKey]?.employment_history) {
        // Use the employment_history array if available
        employmentHistory = data.result.uan_details[
          uanKey
        ].employment_history!.map((emp: any) => ({
          establishment_name: emp.establishment_name || null,
          establishmentName: emp.establishment_name || null,
          name: data.result.uan_details[uanKey]?.basic_details?.name || null,
          customerName:
            data.result.uan_details[uanKey]?.basic_details?.name || null,
          guardian_name: null,
          guardianName: null,
          fatherOrHusbandName: null,
          member_id: emp.member_id || null,
          memberId: emp.member_id || null,
          date_of_joining: emp.date_of_joining || null,
          dateOfJoining: emp.date_of_joining || null,
          joinDate: emp.date_of_joining || null,
          date_of_exit: emp.date_of_exit || null,
          dateOfExit: emp.date_of_exit || null,
          exitDate: emp.date_of_exit || null,
          uan: uanKey,
          uanNumber: uanKey,
        }));
      } else if (
        uanKey &&
        data.result?.uan_details[uanKey]?.employment_details
      ) {
        // Fallback to single record if no employment_history array
        employmentHistory = [
          {
            establishment_name:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_name || null,
            establishmentName:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_name || null,
            name: data.result.uan_details[uanKey]?.basic_details?.name || null,
            customerName:
              data.result.uan_details[uanKey]?.basic_details?.name || null,
            guardian_name: null,
            guardianName: null,
            fatherOrHusbandName: null,
            member_id:
              data.result.uan_details[uanKey]?.employment_details?.member_id ||
              null,
            memberId:
              data.result.uan_details[uanKey]?.employment_details?.member_id ||
              null,
            date_of_joining:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            dateOfJoining:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            joinDate:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            date_of_exit:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            dateOfExit:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            exitDate:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            uan: uanKey,
            uanNumber: uanKey,
          },
        ];
      }

      const employeeDetails = uanKey
        ? {
            name: data.result.uan_details[uanKey]?.basic_details?.name || null,
            customerName:
              data.result.uan_details[uanKey]?.basic_details?.name || null,
            fatherName: null,
            fatherOrHusbandName: null,
            guardian_name: null,
            guardianName: null,
            dateOfBirth:
              data.result.uan_details[uanKey]?.basic_details?.date_of_birth ||
              null,
            uan: uanKey,
            uanNumber: uanKey,
            pan: panFromDb, // Use PAN from DB
            gender:
              data.result.uan_details[uanKey]?.basic_details?.gender || null,
            mobile:
              data.result.uan_details[uanKey]?.basic_details?.mobile || null,
            aadhaar_verification_status:
              data.result.uan_details[uanKey]?.basic_details
                ?.aadhaar_verification_status || null,
            is_employed: data.result?.summary?.is_employed || false,
            establishment_name:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_name || null,
            date_of_joining:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            date_of_exit:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            member_id:
              data.result.uan_details[uanKey]?.employment_details?.member_id ||
              null,
            establishment_id:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_id || null,
            leave_reason:
              data.result.uan_details[uanKey]?.employment_details
                ?.leave_reason || null,
          }
        : {};

      // Store in database if successful and userId provided
      if (isSuccess && userId && employmentHistory.length > 0 && brandId) {
        try {
          // Store ALL employment records from the API response
          const storedRecords = [];
          for (const empRecord of employmentHistory) {
            // Transform the employment record
            const transformedRecord = this.transformEmploymentData(
              empRecord,
              employeeDetails,
            );
            // Check if this specific employment record already exists
            const existingRecord =
              await this.prisma.previous_employments.findFirst({
                where: {
                  userId,
                  OR: [
                    // Try to find by memberId if available
                    transformedRecord.memberId
                      ? {
                          memberId: transformedRecord.memberId,
                          uanNumber: transformedRecord.uan,
                        }
                      : undefined,
                    // Fallback to establishmentName and joiningDate
                    {
                      establishmentName: transformedRecord.establishmentName,
                      uanNumber: transformedRecord.uan,
                      joiningDate: transformedRecord.joiningDateObj,
                    },
                  ].filter(Boolean) as any,
                },
              });

            if (existingRecord) {
              // Update existing record
              await this.prisma.previous_employments.update({
                where: { id: existingRecord.id },
                data: {
                  customerName: transformedRecord.customerName || "Unknown",
                  joiningDate: transformedRecord.joiningDateObj,
                  exitDate: transformedRecord.exitDateObj,
                  guardianName: transformedRecord.guardianName,
                  memberId: transformedRecord.memberId,
                  updatedAt: new Date(),
                },
              });
              storedRecords.push({ id: existingRecord.id, action: "updated" });
            } else {
              // Create new record
              const newRecord = await this.prisma.previous_employments.create({
                data: {
                  id: uuidv4(),
                  userId,
                  brandId,
                  customerName: transformedRecord.customerName || "Unknown",
                  uanNumber: transformedRecord.uan,
                  memberId: transformedRecord.memberId,
                  joiningDate: transformedRecord.joiningDateObj,
                  exitDate: transformedRecord.exitDateObj,
                  guardianName: transformedRecord.guardianName,
                  establishmentName: transformedRecord.establishmentName,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
              storedRecords.push({ id: newRecord.id, action: "created" });
            }
          }

          this.logger.log(
            `Stored ${storedRecords.length} employment records for PAN ${panFromDb} in database (${storedRecords.filter((r) => r.action === "created").length} created, ${storedRecords.filter((r) => r.action === "updated").length} updated)`,
          );
        } catch (dbError) {
          this.logger.error(
            `Failed to store employment records: ${dbError.message}`,
            dbError.stack,
          );
        }
      }

      // Log the request - only if brandId is valid
      try {
        if (brandId) {
          await this.logUanToEmploymentRequest({
            userId,
            brandId,
            uan: uanKey || "N/A",
            provider: BrandProviderName.DIGITAP,
            status: isSuccess
              ? UanToEmploymentStatus.SUCCESS
              : UanToEmploymentStatus.FAILED,
            request: { ...payload, pan: "***MASKED***" },
            response: data,
            errorMessage: isSuccess ? null : "No employment data found",
          });
        }
      } catch (logError) {
        this.logger.error(
          `Failed to log Digitap PAN request: ${logError.message}`,
        );
      }

      const message = isSuccess
        ? "Employment history fetch successful"
        : "Employment history fetch failed";

      return {
        success: isSuccess,
        employmentHistory,
        employeeDetails,
        message,
        provider: "DIGITAP",
        raw: data,
      };
    } catch (error) {
      this.logger.error("Digitap PAN to employment error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        payload: { ...payload, pan: "***MASKED***" },
      });

      // Log failed request - only if brandId is valid
      try {
        if (brandId) {
          await this.logUanToEmploymentRequest({
            userId,
            brandId,
            uan: "N/A",
            provider: BrandProviderName.DIGITAP,
            status: UanToEmploymentStatus.FAILED,
            request: { ...payload, pan: "***MASKED***" },
            response: null,
            errorMessage: error.message || "API call failed",
          });
        }
      } catch (logError) {
        this.logger.error(
          `Failed to log failed Digitap PAN request: ${logError.message}`,
        );
      }

      throw new HttpException(
        error.response?.data?.message ||
          "Digitap PAN to employment lookup failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEmploymentHistoryWithDigitapByUan(
    brandId?: string,
    userId?: string,
  ): Promise<UanToEmploymentResponse> {
    if (!userId) {
      throw new HttpException(
        "User ID is required to fetch UAN from database",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 1: Fetch UAN from database
    let uanFromDb: string | null = null;

    try {
      // First, try to get UAN from uan_to_employment_log (most recent successful one)
      const uanLog = await this.prisma.uan_to_employment_log.findFirst({
        where: {
          userId,
          status: UanToEmploymentStatus.SUCCESS, // Only successful lookups
          uan: { not: "" },
        },
        orderBy: {
          createdAt: "desc", // Get most recent
        },
        select: {
          uan: true,
        },
      });

      if (uanLog?.uan) {
        uanFromDb = uanLog.uan;
        this.logger.log(
          `Retrieved UAN from uan_to_employment_log for user ${userId}: ${uanFromDb}`,
        );
      } else {
        // If not found in logs, try to get from previous_employments
        const previousEmployment =
          await this.prisma.previous_employments.findFirst({
            where: {
              userId,
              uanNumber: { not: null },
            },
            orderBy: {
              updatedAt: "desc", // Get most recent
            },
            select: {
              uanNumber: true,
            },
          });

        if (previousEmployment?.uanNumber) {
          uanFromDb = previousEmployment.uanNumber;
          this.logger.log(
            `Retrieved UAN from previous_employments for user ${userId}: ${uanFromDb}`,
          );
        } else {
          this.logger.warn(`No UAN found for user, skipping Digitap UAN step.`);
          return {
            success: false,
            message: "UAN not found",
            employmentHistory: [],
            provider: "DIGITAP",
          };
        }
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch UAN from database`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Create request object from the UAN fetched from DB
    const request: UanToEmploymentRequest = {
      uan: uanFromDb,
      // Note: dob and employeeName might not be available from DB
      // You might need to fetch these from user profile if needed
    };

    // Check cache first - fetch ALL records for this user and UAN
    if (userId && request.uan) {
      try {
        const cachedData = await this.prisma.previous_employments.findMany({
          where: {
            userId,
            uanNumber: request.uan,
          },
          orderBy: {
            joiningDate: "desc",
          },
        });

        if (cachedData.length > 0) {
          this.logger.log(
            `Returning ${cachedData.length} cached employment records for user ${userId} and UAN ${request.uan}`,
          );

          const employmentHistory = cachedData.map((cachedRecord) => ({
            establishmentName: cachedRecord.establishmentName,
            customerName: cachedRecord.customerName,
            memberId: cachedRecord.memberId,
            joiningDate: cachedRecord.joiningDate
              ? this.formatDateToDDMMYYYY(cachedRecord.joiningDate)
              : null,
            exitDate: cachedRecord.exitDate
              ? this.formatDateToDDMMYYYY(cachedRecord.exitDate)
              : null,
            guardianName: cachedRecord.guardianName,
            uan: cachedRecord.uanNumber,
            establishment_name: cachedRecord.establishmentName,
            name: cachedRecord.customerName,
            member_id: cachedRecord.memberId,
            date_of_joining: cachedRecord.joiningDate
              ? this.formatDateToDDMMYYYY(cachedRecord.joiningDate)
              : null,
            date_of_exit: cachedRecord.exitDate
              ? this.formatDateToDDMMYYYY(cachedRecord.exitDate)
              : null,
            guardian_name: cachedRecord.guardianName,
            uanNumber: cachedRecord.uanNumber,
          }));

          // Get the most recent record for employee details
          const mostRecentRecord = cachedData[0];

          return {
            success: true,
            employmentHistory,
            employeeDetails: {
              name: mostRecentRecord.customerName,
              uan: mostRecentRecord.uanNumber,
            },
            message: `Employment history retrieved from cache (${cachedData.length} records)`,
            provider: "DIGITAP",
            raw: { fromCache: true },
          };
        }
      } catch (cacheError) {
        this.logger.warn(
          `Cache lookup failed for UAN ${request.uan}: ${cacheError.message}`,
        );
      }
    }

    // If not in cache, call Digitap API
    const url = "https://svc.digitap.ai/cv/v4/uan_basic/sync";
    const authKey = this.configService.get<string>(
      "DIGITAP_UAN_TO_EMPLOYMENT_AUTH_KEY",
    );

    if (!authKey) {
      throw new HttpException(
        "Digitap UAN to employment configuration is missing",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: any = {
      client_ref_num: this.generateClientRefNum(),
      uan: request.uan, // Use UAN from DB
    };
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DigitapMobileToEmploymentResponse>(url, payload, {
          headers: {
            "Content-Type": "application/json",
            authorization: `Basic ${authKey}`,
          },
        }),
      );

      const isApiSuccess = data.http_response_code === 200;
      const hasEmploymentData =
        data.result_code === 101 &&
        data.result?.uan_details &&
        Object.keys(data.result.uan_details).length > 0;

      const isSuccess = isApiSuccess && hasEmploymentData;

      const uanKeys = Object.keys(data.result?.uan_details || {});
      const uanKey = uanKeys.length > 0 ? uanKeys[0] : request.uan;

      // Get employment history - check both employment_history array and employment_details
      let employmentHistory = [];

      if (uanKey && data.result?.uan_details[uanKey]?.employment_history) {
        // Use the employment_history array if available
        employmentHistory = data.result.uan_details[
          uanKey
        ].employment_history!.map((emp: any) => ({
          establishment_name: emp.establishment_name || null,
          establishmentName: emp.establishment_name || null,
          name: data.result.uan_details[uanKey]?.basic_details?.name || null,
          customerName:
            data.result.uan_details[uanKey]?.basic_details?.name || null,
          guardian_name: null,
          guardianName: null,
          fatherOrHusbandName: null,
          member_id: emp.member_id || null,
          memberId: emp.member_id || null,
          date_of_joining: emp.date_of_joining || null,
          dateOfJoining: emp.date_of_joining || null,
          joinDate: emp.date_of_joining || null,
          date_of_exit: emp.date_of_exit || null,
          dateOfExit: emp.date_of_exit || null,
          exitDate: emp.date_of_exit || null,
          uan: uanKey,
          uanNumber: uanKey,
        }));
      } else if (
        uanKey &&
        data.result?.uan_details[uanKey]?.employment_details
      ) {
        // Fallback to single record if no employment_history array
        employmentHistory = [
          {
            establishment_name:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_name || null,
            establishmentName:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_name || null,
            name: data.result.uan_details[uanKey]?.basic_details?.name || null,
            customerName:
              data.result.uan_details[uanKey]?.basic_details?.name || null,
            guardian_name: null,
            guardianName: null,
            fatherOrHusbandName: null,
            member_id:
              data.result.uan_details[uanKey]?.employment_details?.member_id ||
              null,
            memberId:
              data.result.uan_details[uanKey]?.employment_details?.member_id ||
              null,
            date_of_joining:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            dateOfJoining:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            joinDate:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            date_of_exit:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            dateOfExit:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            exitDate:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            uan: uanKey,
            uanNumber: uanKey,
          },
        ];
      }

      const employeeDetails = uanKey
        ? {
            name: data.result.uan_details[uanKey]?.basic_details?.name || null,
            customerName:
              data.result.uan_details[uanKey]?.basic_details?.name || null,
            fatherName: null,
            fatherOrHusbandName: null,
            guardian_name: null,
            guardianName: null,
            dateOfBirth:
              data.result.uan_details[uanKey]?.basic_details?.date_of_birth ||
              null,
            uan: uanKey,
            uanNumber: uanKey,
            pan: null, // PAN not available in UAN lookup
            gender:
              data.result.uan_details[uanKey]?.basic_details?.gender || null,
            mobile:
              data.result.uan_details[uanKey]?.basic_details?.mobile || null,
            aadhaar_verification_status:
              data.result.uan_details[uanKey]?.basic_details
                ?.aadhaar_verification_status || null,
            is_employed: data.result?.summary?.is_employed || false,
            establishment_name:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_name || null,
            date_of_joining:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_joining || null,
            date_of_exit:
              data.result.uan_details[uanKey]?.employment_details
                ?.date_of_exit || null,
            member_id:
              data.result.uan_details[uanKey]?.employment_details?.member_id ||
              null,
            establishment_id:
              data.result.uan_details[uanKey]?.employment_details
                ?.establishment_id || null,
            leave_reason:
              data.result.uan_details[uanKey]?.employment_details
                ?.leave_reason || null,
          }
        : {};

      // Store in database if successful and userId provided
      if (isSuccess && userId && employmentHistory.length > 0 && brandId) {
        try {
          // Store ALL employment records from the API response
          const storedRecords = [];
          for (const empRecord of employmentHistory) {
            // Transform the employment record
            const transformedRecord = this.transformEmploymentData(
              empRecord,
              employeeDetails,
            );

            // Use member_id and establishment_name as unique identifiers
            // If member_id is not available, use establishment_name and date_of_joining
            const recordIdentifier = transformedRecord.memberId
              ? `${transformedRecord.uan}-${transformedRecord.memberId}-${transformedRecord.establishmentName}`
              : `${transformedRecord.uan}-${transformedRecord.establishmentName}-${transformedRecord.joiningDate}`;

            // Check if this specific employment record already exists
            const existingRecord =
              await this.prisma.previous_employments.findFirst({
                where: {
                  userId,
                  OR: [
                    // Try to find by memberId if available
                    transformedRecord.memberId
                      ? {
                          memberId: transformedRecord.memberId,
                          uanNumber: transformedRecord.uan,
                        }
                      : undefined,
                    // Fallback to establishmentName and joiningDate
                    {
                      establishmentName: transformedRecord.establishmentName,
                      uanNumber: transformedRecord.uan,
                      joiningDate: transformedRecord.joiningDateObj,
                    },
                  ].filter(Boolean) as any,
                },
              });

            if (existingRecord) {
              // Update existing record
              await this.prisma.previous_employments.update({
                where: { id: existingRecord.id },
                data: {
                  customerName: transformedRecord.customerName || "Unknown",
                  joiningDate: transformedRecord.joiningDateObj,
                  exitDate: transformedRecord.exitDateObj,
                  guardianName: transformedRecord.guardianName,
                  memberId: transformedRecord.memberId,
                  updatedAt: new Date(),
                },
              });
              storedRecords.push({ id: existingRecord.id, action: "updated" });
            } else {
              // Create new record
              const newRecord = await this.prisma.previous_employments.create({
                data: {
                  id: uuidv4(),
                  userId,
                  brandId,
                  customerName: transformedRecord.customerName || "Unknown",
                  uanNumber: transformedRecord.uan,
                  memberId: transformedRecord.memberId,
                  joiningDate: transformedRecord.joiningDateObj,
                  exitDate: transformedRecord.exitDateObj,
                  guardianName: transformedRecord.guardianName,
                  establishmentName: transformedRecord.establishmentName,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
              storedRecords.push({ id: newRecord.id, action: "created" });
            }
          }

          this.logger.log(
            `Stored ${storedRecords.length} employment records for UAN ${request.uan} in database (${storedRecords.filter((r) => r.action === "created").length} created, ${storedRecords.filter((r) => r.action === "updated").length} updated)`,
          );
        } catch (dbError) {
          this.logger.error(
            `Failed to store employment records: ${dbError.message}`,
            dbError.stack,
          );
        }
      }

      // Log the request - only if brandId is valid
      try {
        if (brandId) {
          await this.logUanToEmploymentRequest({
            userId,
            brandId,
            uan: uanKey,
            provider: BrandProviderName.DIGITAP,
            status: isSuccess
              ? UanToEmploymentStatus.SUCCESS
              : UanToEmploymentStatus.FAILED,
            request: payload,
            response: data,
            errorMessage: isSuccess ? null : "No employment data found",
          });
        }
      } catch (logError) {
        this.logger.error(
          `Failed to log Digitap UAN request: ${logError.message}`,
        );
      }

      const message = isSuccess
        ? "Employment history fetch successful"
        : "Employment history fetch failed";

      return {
        success: isSuccess,
        employmentHistory,
        employeeDetails,
        message,
        provider: "DIGITAP",
        raw: data,
      };
    } catch (error) {
      this.logger.error("Digitap UAN to employment error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        payload: payload,
      });

      // Log failed request - only if brandId is valid
      try {
        if (brandId) {
          await this.logUanToEmploymentRequest({
            userId,
            brandId,
            uan: request.uan,
            provider: BrandProviderName.DIGITAP,
            status: UanToEmploymentStatus.FAILED,
            request: payload,
            response: null,
            errorMessage: error.message || "API call failed",
          });
        }
      } catch (logError) {
        this.logger.error(
          `Failed to log failed Digitap UAN request: ${logError.message}`,
        );
      }

      throw new HttpException(
        error.response?.data?.message ||
          "Digitap UAN to employment lookup failed",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEmploymentHistoryByUanWithFallback(
    brandId: string,
    request: UanToEmploymentRequest,
    userId?: string,
  ): Promise<UanToEmploymentResponse> {
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.UAN_TO_EMPLOYMENT,
        isActive: true,
        isDisabled: false,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    if (providers.length === 0) {
      throw new HttpException(
        "No active UAN to employment provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let lastError: any;
    const hasValidUan = request.uan && request.uan !== "DIGITAP_NO_UAN_NEEDED";

    for (const provider of providers) {
      try {
        this.logger.log(
          `Attempting UAN to employment lookup with ${provider.provider} (Primary: ${provider.isPrimary})`,
        );

        if (hasValidUan && provider.provider === BrandProviderName.DIGITAP) {
          this.logger.warn(
            `Skipping DIGITAP provider on fallback attempt (UAN: ${request.uan}) as it failed earlier or is unreliable for UAN-based lookup.`,
          );
          continue;
        }

        if (
          provider.provider !== BrandProviderName.DIGITAP &&
          request.uan === "DIGITAP_NO_UAN_NEEDED"
        ) {
          this.logger.log(
            `Skipping ${provider.provider} provider as we are in the initial mobile-only Digitap flow.`,
          );
          continue;
        }

        let response: UanToEmploymentResponse;
        let status: UanToEmploymentStatus = UanToEmploymentStatus.FAILED;

        switch (provider.provider) {
          case BrandProviderName.SIGNZY:
            response = await this.getEmploymentHistoryWithSignzy(request);
            break;
          case BrandProviderName.KYCKART:
            response = await this.getEmploymentHistoryWithKycKart(request);
            break;
          case BrandProviderName.DIGITAP:
            response = await this.getEmploymentHistoryWithDigitap(request);
            break;
          default:
            this.logger.warn(`Unsupported provider: ${provider.provider}`);
            continue;
        }

        status = response.success
          ? UanToEmploymentStatus.SUCCESS
          : UanToEmploymentStatus.FAILED;

        await this.logUanToEmploymentRequest({
          userId,
          brandId,
          uan: request.uan,
          provider: provider.provider,
          status,
          request,
          response,
          errorMessage: null,
        });

        return response;
      } catch (error) {
        lastError = error;
        this.logger.error(
          `Provider ${provider.provider} failed: ${error.message}`,
        );

        await this.logUanToEmploymentRequest({
          userId,
          brandId,
          uan: request.uan,
          provider: provider.provider,
          status: UanToEmploymentStatus.FAILED,
          request,
          response: null,
          errorMessage: error.message || "Unknown error",
        });

        continue;
      }
    }

    throw new HttpException(
      lastError?.message || "All UAN to employment providers failed",
      lastError?.status || HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  async getCompleteEmploymentHistoryWithFallback(
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string,
    options?: GetUanAndHistoryOptions,
  ): Promise<any> {
    try {
      const existingRecord = await this.prisma.kyccart_some_table.findFirst({
        where: { userId, brandId },
      });

      if (existingRecord?.employmentHistory) {
        this.logger.log(
          `Returning cached employment history for user ${userId}`,
        );
        return {
          success: true,
          data: existingRecord.employmentHistory,
          message: "Employment history retrieved from cache",
        };
      }

      if (options?.cacheOnly) {
        this.logger.log(`No cache found for user ${userId}, returning empty`);
        return {
          success: false,
          data: null,
          message: "No cached employment history",
        };
      }
    } catch (dbErr) {
      this.logger.error("Failed to read cache from kyccart_some_table", dbErr);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      throw new NotFoundException(`No phone number found for user ${userId}`);
    }

    const mobileNumber = user.phoneNumber.replace(/^(\+91|91)/, "").slice(-10);
    if (!/^\d{10}$/.test(mobileNumber)) {
      throw new InternalServerErrorException(
        `Invalid mobile number format: ${user.phoneNumber}`,
      );
    }

    try {
      // Get ALL active UAN to employment providers for this brand
      const allProviders = await this.prisma.brandProvider.findMany({
        where: {
          brandId,
          type: BrandProviderType.UAN_TO_EMPLOYMENT,
          isActive: true,
          isDisabled: false,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });

      this.logger.debug(
        `Found ${allProviders.length} active UAN to employment providers for brand ${brandId}`,
      );

      // Find the primary provider
      const primaryProvider = allProviders.find((p) => p.isPrimary);

      // Check if Digitap is primary
      const shouldUseDigitap =
        primaryProvider?.provider === BrandProviderName.DIGITAP;

      if (shouldUseDigitap) {
        // Use Digitap with mobile-only (no UAN needed) - ONLY if it's primary
        this.logger.log(
          `Using Digitap provider (primary) - mobile-only lookup for: ${mobileNumber}`,
        );

        try {
          // Try Digitap first with mobile only
          const digitapRequest = {
            uan: null, // Digitap doesn't need UAN when we have mobile
            pan: null,
            mobile: mobileNumber,
            dob: null,
            employeeName: null,
            checkId,
            groupId,
          };

          this.logger.log(
            `Calling Digitap (primary) with mobile: ${mobileNumber}`,
          );
          const digitapResponse =
            await this.getEmploymentHistoryWithDigitap(digitapRequest);

          // Log the Digitap request
          await this.logUanToEmploymentRequest({
            userId,
            brandId,
            uan: "N/A",
            provider: BrandProviderName.DIGITAP,
            status: digitapResponse.success
              ? UanToEmploymentStatus.SUCCESS
              : UanToEmploymentStatus.FAILED,
            request: digitapRequest,
            response: digitapResponse,
            errorMessage: digitapResponse.success
              ? null
              : digitapResponse.message,
          });

          if (
            digitapResponse.success &&
            digitapResponse.employmentHistory?.length > 0
          ) {
            this.logger.log(
              `Digitap (primary) succeeded with ${digitapResponse.employmentHistory.length} records`,
            );

            // Process Digitap response
            const flattenedEmploymentHistory = [];
            if (
              digitapResponse?.success &&
              Array.isArray(digitapResponse.employmentHistory)
            ) {
              digitapResponse.employmentHistory.forEach(
                (item: any, index: number) => {
                  try {
                    const transformedItem = this.transformEmploymentData(
                      item,
                      digitapResponse.employeeDetails || item.employeeDetails,
                    );

                    flattenedEmploymentHistory.push(transformedItem);
                  } catch (transformError) {
                    this.logger.error(
                      `Failed to transform employment record ${index + 1} from Digitap:`,
                      transformError,
                    );
                  }
                },
              );
            }

            // Store in database
            if (flattenedEmploymentHistory.length > 0) {
              try {
                const employmentRecords = flattenedEmploymentHistory
                  .filter((item) => {
                    const hasData =
                      item.establishmentName ||
                      item.customerName ||
                      item.memberId ||
                      item.uan;
                    return hasData;
                  })
                  .map((item, index) => ({
                    id: uuidv4(),
                    userId,
                    brandId,
                    customerName: item.customerName || "Unknown",
                    uanNumber: item.uan,
                    memberId: item.memberId,
                    joiningDate: item.joiningDateObj,
                    exitDate: item.exitDateObj,
                    guardianName: item.guardianName,
                    establishmentName: item.establishmentName,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }));

                if (employmentRecords.length > 0) {
                  await this.prisma.previous_employments.createMany({
                    data: employmentRecords,
                    skipDuplicates: true,
                  });
                  this.logger.log(
                    `Successfully persisted ${employmentRecords.length} employment records from Digitap (primary)`,
                  );
                }
              } catch (persistErr) {
                this.logger.error(
                  "Failed to persist previous_employments:",
                  persistErr,
                );
              }
            }

            // Build response
            const responseData = {
              mobileNo: mobileNumber,
              employmentHistory: flattenedEmploymentHistory.map((item) => ({
                establishment_name: item.establishmentName,
                name: item.customerName,
                member_id: item.memberId,
                date_of_joining: item.joiningDate,
                date_of_exit: item.exitDate,
                guardian_name: item.guardianName,
                uan: item.uan,
              })),
              rawResults: [digitapResponse],
              totalRecords: flattenedEmploymentHistory.length,
            };

            // Cache the result
            try {
              await this.prisma.kyccart_some_table.create({
                data: {
                  userId,
                  brandId,
                  employmentHistory: responseData as any,
                },
              });
              this.logger.log(
                `Successfully cached employment history for user ${userId}`,
              );
            } catch (cacheWriteErr) {
              this.logger.warn(
                "Failed to write to kyccart_some_table:",
                cacheWriteErr,
              );
            }

            return {
              success: true,
              data: responseData,
              message:
                "Employment history retrieved successfully from Digitap (primary)",
            };
          } else {
            // Digitap (primary) failed or returned no data, try other providers
            this.logger.log(
              `Digitap (primary) returned no data, trying other providers`,
            );
          }
        } catch (digitapError) {
          this.logger.error(
            `Digitap (primary) failed: ${digitapError.message}`,
          );
          // Continue to try other providers
        }
      }

      // If we get here, either:
      // 1. Digitap is not primary, OR
      // 2. Digitap failed, OR
      // 3. Digitap returned no data

      // Get UAN for other providers (Signzy/KycKart)
      this.logger.log(
        `Fetching UAN for mobile: ${mobileNumber} for other providers`,
      );

      let uanList: string[] = [];
      try {
        const uanResponse =
          await this.phoneToUanService.getUanByPhoneWithFallback(
            brandId,
            { mobileNumber, checkId, groupId },
            userId,
          );

        if (uanResponse?.success) {
          if (uanResponse.uanList && uanResponse.uanList.length > 0) {
            uanList = uanResponse.uanList;
          } else if (uanResponse.uan) {
            uanList = [uanResponse.uan];
          }

          if (uanList.length > 0) {
            this.logger.log(
              `Found ${uanList.length} UAN(s): ${uanList.join(", ")}`,
            );
          } else {
            throw new NotFoundException(
              "No UAN found for the provided mobile number.",
            );
          }
        } else {
          throw new NotFoundException(
            uanResponse?.message || "Failed to find UAN",
          );
        }
      } catch (uanError) {
        throw new NotFoundException(`UAN lookup failed: ${uanError.message}`);
      }

      // Get active providers (excluding Digitap if it's not primary or failed)
      const otherProviders = allProviders.filter(
        (p) => !shouldUseDigitap || p.provider !== BrandProviderName.DIGITAP,
      );

      if (otherProviders.length === 0) {
        this.logger.warn(`No active providers configured for brand ${brandId}`);
        throw new HttpException(
          "No active UAN to employment provider configured for this brand",
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Try each UAN with providers
      const allHistoryResults: any[] = [];
      const flattenedEmploymentHistory: any[] = [];

      for (const uan of uanList) {
        if (!uan || typeof uan !== "string" || uan.trim() === "") {
          continue;
        }

        try {
          this.logger.log(`Fetching employment history for UAN: ${uan}`);

          // For UAN-based providers, we need to pass the actual UAN
          const historyRequest = {
            uan: uan, // Pass actual UAN for Signzy/KycKart
            pan: null,
            mobile: null,
            dob: null,
            employeeName: null,
            checkId,
            groupId,
          };

          // Try each active provider in order
          let historyResponse: UanToEmploymentResponse | null = null;

          for (const provider of otherProviders) {
            try {
              this.logger.log(
                `Trying ${provider.provider} for UAN ${uan} (Primary: ${provider.isPrimary})`,
              );

              switch (provider.provider) {
                case BrandProviderName.SIGNZY:
                  historyResponse =
                    await this.getEmploymentHistoryWithSignzy(historyRequest);
                  break;
                case BrandProviderName.KYCKART:
                  historyResponse =
                    await this.getEmploymentHistoryWithKycKart(historyRequest);
                  break;
                case BrandProviderName.DIGITAP:
                  // Only try Digitap if we have mobile (not UAN-based)
                  if (historyRequest.mobile) {
                    historyResponse =
                      await this.getEmploymentHistoryWithDigitap(
                        historyRequest,
                      );
                  } else {
                    continue;
                  }
                  break;
                default:
                  continue;
              }

              this.logger.log(
                `${provider.provider} response for UAN ${uan}: ${historyResponse.success ? "Success" : "Failed"}`,
              );

              // Log the request
              await this.logUanToEmploymentRequest({
                userId,
                brandId,
                uan: uan,
                provider: provider.provider,
                status: historyResponse.success
                  ? UanToEmploymentStatus.SUCCESS
                  : UanToEmploymentStatus.FAILED,
                request: historyRequest,
                response: historyResponse,
                errorMessage: historyResponse.success
                  ? null
                  : historyResponse.message,
              });

              // If successful, break out of provider loop
              if (historyResponse.success) {
                break;
              }
            } catch (providerError) {
              this.logger.warn(
                `${provider.provider} failed for UAN ${uan}: ${providerError.message}`,
              );

              // Log the failed attempt
              await this.logUanToEmploymentRequest({
                userId,
                brandId,
                uan: uan,
                provider: provider.provider,
                status: UanToEmploymentStatus.FAILED,
                request: historyRequest,
                response: null,
                errorMessage: providerError.message,
              });

              // Continue to next provider
            }
          }

          if (historyResponse) {
            allHistoryResults.push(historyResponse);

            if (
              historyResponse.success &&
              Array.isArray(historyResponse.employmentHistory)
            ) {
              historyResponse.employmentHistory.forEach((item: any) => {
                try {
                  const transformedItem = this.transformEmploymentData(
                    item,
                    historyResponse!.employeeDetails || item.employeeDetails,
                  );
                  flattenedEmploymentHistory.push(transformedItem);
                } catch (transformError) {
                  this.logger.error(
                    `Failed to transform employment record:`,
                    transformError,
                  );
                }
              });
            }
          }
        } catch (historyError) {
          this.logger.error(
            `Failed to get history for UAN ${uan}:`,
            historyError,
          );
        }
      }

      this.logger.log(
        `Total employment records collected: ${flattenedEmploymentHistory.length}`,
      );

      // Store results if any
      if (flattenedEmploymentHistory.length > 0) {
        try {
          const employmentRecords = flattenedEmploymentHistory
            .filter(
              (item) =>
                item.establishmentName ||
                item.customerName ||
                item.memberId ||
                item.uan,
            )
            .map((item) => ({
              id: uuidv4(),
              userId,
              brandId,
              customerName: item.customerName || "Unknown",
              uanNumber: item.uan,
              memberId: item.memberId,
              joiningDate: item.joiningDateObj,
              exitDate: item.exitDateObj,
              guardianName: item.guardianName,
              establishmentName: item.establishmentName,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

          if (employmentRecords.length > 0) {
            await this.prisma.previous_employments.createMany({
              data: employmentRecords,
              skipDuplicates: true,
            });
          }
        } catch (persistErr) {
          this.logger.error(
            "Failed to persist previous_employments:",
            persistErr,
          );
        }
      }

      // Build response
      const responseData = {
        mobileNo: mobileNumber,
        uanList: uanList,
        employmentHistory: flattenedEmploymentHistory.map((item) => ({
          establishment_name: item.establishmentName,
          name: item.customerName,
          member_id: item.memberId,
          date_of_joining: item.joiningDate,
          date_of_exit: item.exitDate,
          guardian_name: item.guardianName,
          uan: item.uan,
        })),
        rawResults: allHistoryResults,
        totalRecords: flattenedEmploymentHistory.length,
      };

      const hasEmploymentData = flattenedEmploymentHistory.length > 0;
      const finalMessage = hasEmploymentData
        ? "Employment history retrieved successfully"
        : "No employment history found for the User";

      // Cache the result
      try {
        await this.prisma.kyccart_some_table.create({
          data: {
            userId,
            brandId,
            employmentHistory: responseData,
          },
        });
      } catch (cacheWriteErr) {
        this.logger.warn(
          "Failed to write to kyccart_some_table:",
          cacheWriteErr,
        );
      }

      return {
        success: hasEmploymentData,
        data: responseData,
        message: finalMessage,
      };
    } catch (error: any) {
      this.logger.error("EPFO data retrieval failed:", error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error?.message || "Failed to retrieve employment history",
      );
    }
  }

  private async shouldUseDigitapForEmployment(
    brandId: string,
  ): Promise<boolean> {
    try {
      const providers = await this.prisma.brandProvider.findMany({
        where: {
          brandId,
          type: BrandProviderType.UAN_TO_EMPLOYMENT,
          isActive: true,
          isDisabled: false,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });

      const digitapProvider = providers.find(
        (provider) => provider.provider === BrandProviderName.DIGITAP,
      );

      const shouldUse = Boolean(digitapProvider);
      this.logger.debug(
        `Digitap provider check - available: ${shouldUse}, total providers: ${providers.length}`,
      );

      return shouldUse;
    } catch (error) {
      this.logger.error("Error checking Digitap provider:", error);
      return false;
    }
  }

  async getUanToEmploymentLogs(
    brandId: string,
    status?: string,
    provider?: string,
    skip: number = 0,
    take: number = 20,
  ) {
    const where: any = { brandId };

    if (status) {
      where.status = status;
    }

    if (provider) {
      where.provider = provider;
    }

    const [logs, total] = await Promise.all([
      this.prisma.uan_to_employment_log.findMany({
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
      this.prisma.uan_to_employment_log.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }

  /**
   * Comprehensive fallback function for employment history lookup
   * Flow: PAN → UAN → Signzy → KycKart
   */
  async getEmploymentHistoryWithComprehensiveFallback(
    brandId: string,
    userId?: string,
    // Remove mobileNumber parameter since we'll fetch from DB
  ): Promise<UanToEmploymentResponse> {
    this.logger.log(
      `Starting comprehensive fallback for brand: ${brandId}, user: ${userId}`,
    );

    // Fetch user's phone number from database
    let userMobileNumber: string | null = null;
    if (userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { phoneNumber: true },
        });

        if (user?.phoneNumber) {
          userMobileNumber = user.phoneNumber;
          this.logger.log(`Found user phone number: ${userMobileNumber}`);
        } else {
          this.logger.warn(`No phone number found for user ${userId}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch user phone number: ${error.message}`,
        );
      }
    }

    // Check cache first (if userId is provided)
    if (userId) {
      try {
        const cachedData = await this.prisma.previous_employments.findMany({
          where: {
            userId,
            brandId,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 20,
        });

        if (cachedData.length > 0) {
          this.logger.log(
            `Returning ${cachedData.length} cached employment records for user ${userId}`,
          );

          const employmentHistory = cachedData.map((cachedRecord) => ({
            establishmentName: cachedRecord.establishmentName,
            customerName: cachedRecord.customerName,
            memberId: cachedRecord.memberId,
            joiningDate: cachedRecord.joiningDate
              ? this.formatDateToDDMMYYYY(cachedRecord.joiningDate)
              : null,
            exitDate: cachedRecord.exitDate
              ? this.formatDateToDDMMYYYY(cachedRecord.exitDate)
              : null,
            guardianName: cachedRecord.guardianName,
            uan: cachedRecord.uanNumber,
            establishment_name: cachedRecord.establishmentName,
            name: cachedRecord.customerName,
            member_id: cachedRecord.memberId,
            date_of_joining: cachedRecord.joiningDate
              ? this.formatDateToDDMMYYYY(cachedRecord.joiningDate)
              : null,
            date_of_exit: cachedRecord.exitDate
              ? this.formatDateToDDMMYYYY(cachedRecord.exitDate)
              : null,
            guardian_name: cachedRecord.guardianName,
            uanNumber: cachedRecord.uanNumber,
          }));

          // Get the most recent record for employee details
          const mostRecentRecord = cachedData[0];

          return {
            success: true,
            employmentHistory,
            employeeDetails: {
              name: mostRecentRecord.customerName,
              uan: mostRecentRecord.uanNumber,
            },
            message: `Employment history retrieved from cache (${cachedData.length} records)`,
            provider: "CACHE",
            raw: { fromCache: true },
          };
        }
      } catch (cacheError) {
        this.logger.warn(`Cache lookup failed: ${cacheError.message}`);
      }
    }

    // Get all active providers for this brand
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.UAN_TO_EMPLOYMENT,
        isActive: true,
        isDisabled: false,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    if (providers.length === 0) {
      throw new HttpException(
        "No active UAN to employment provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.logger.log(
      `Found ${providers.length} active providers for brand ${brandId}`,
    );

    // Store last error for reporting
    let lastError: any = null;
    let lastResponse: UanToEmploymentResponse | null = null;

    // Step 1: Try Digitap with PAN (if userId provided and Digitap is available)
    if (userId) {
      const digitapProvider = providers.find(
        (p) => p.provider === BrandProviderName.DIGITAP,
      );
      if (digitapProvider) {
        try {
          this.logger.log("Step 1: Trying Digitap with PAN...");
          const panResponse = await this.getEmploymentHistoryWithDigitapByPan(
            brandId,
            userId,
          );

          if (
            panResponse.success &&
            panResponse.employmentHistory?.length > 0
          ) {
            this.logger.log(
              `Digitap PAN lookup successful with ${panResponse.employmentHistory.length} records`,
            );
            return panResponse;
          } else {
            this.logger.log(
              "Digitap PAN lookup unsuccessful, moving to next step",
            );
            lastResponse = panResponse;
          }
        } catch (error) {
          lastError = error;
          this.logger.warn(`Digitap PAN lookup failed: ${error.message}`);
        }
      } else {
        this.logger.log("Digitap provider not available, skipping PAN lookup");
      }
    } else {
      this.logger.log("No userId provided, skipping PAN lookup");
    }

    // Step 2: Try Digitap with UAN (if userId provided and Digitap is available)
    if (userId) {
      const digitapProvider = providers.find(
        (p) => p.provider === BrandProviderName.DIGITAP,
      );
      if (digitapProvider) {
        try {
          this.logger.log("Step 2: Trying Digitap with UAN...");
          const uanResponse = await this.getEmploymentHistoryWithDigitapByUan(
            brandId,
            userId,
          );

          if (
            uanResponse.success &&
            uanResponse.employmentHistory?.length > 0
          ) {
            this.logger.log(
              `Digitap UAN lookup successful with ${uanResponse.employmentHistory.length} records`,
            );
            return uanResponse;
          } else {
            this.logger.log(
              "Digitap UAN lookup unsuccessful, moving to next step",
            );
            lastResponse = uanResponse;
          }
        } catch (error) {
          lastError = error;
          this.logger.warn(`Digitap UAN lookup failed: ${error.message}`);
        }
      }
    } else {
      this.logger.log("No userId provided, skipping UAN lookup");
    }

    // Step 3: Try Signzy (if Signzy is available and we have user's mobile number)
    const signzyProvider = providers.find(
      (p) => p.provider === BrandProviderName.SIGNZY,
    );
    if (signzyProvider && userMobileNumber) {
      try {
        this.logger.log("Step 3: Trying Signzy with user mobile number...");

        // Get UAN using Signzy phone-to-UAN service
        let uanForSignzy: string | null = null;

        try {
          this.logger.log(
            `Getting UAN for user mobile: ${userMobileNumber} using Signzy`,
          );
          const uanResponse = await this.phoneToUanService.getUanByPhone(
            brandId,
            { mobileNumber: userMobileNumber },
            userId,
          );

          if (uanResponse?.success && uanResponse.uan) {
            uanForSignzy = uanResponse.uan;
            this.logger.log(`Got UAN from Signzy: ${uanForSignzy}`);
          } else {
            this.logger.log("No UAN found from Signzy phone-to-UAN service");
          }
        } catch (uanError) {
          this.logger.warn(
            `Failed to get UAN from Signzy: ${uanError.message}`,
          );
        }

        if (uanForSignzy) {
          const signzyRequest: UanToEmploymentRequest = {
            uan: uanForSignzy,
            mobile: userMobileNumber.replace(/\D/g, "").slice(-10),
          };

          const signzyResponse =
            await this.getEmploymentHistoryWithSignzy(signzyRequest);
          await this.logUanToEmploymentRequest({
            userId,
            brandId,
            uan: uanForSignzy,
            provider: BrandProviderName.SIGNZY,
            status: signzyResponse.success
              ? UanToEmploymentStatus.SUCCESS
              : UanToEmploymentStatus.FAILED,
            request: signzyRequest,
            response: signzyResponse,
            errorMessage: signzyResponse.success
              ? null
              : signzyResponse.message,
          });

          if (
            signzyResponse.success &&
            signzyResponse.employmentHistory?.length > 0
          ) {
            this.logger.log(
              `Signzy lookup successful with ${signzyResponse.employmentHistory.length} records`,
            );

            // Store results in database
            await this.storeEmploymentHistoryInDatabase(
              signzyResponse.employmentHistory,
              signzyResponse.employeeDetails,
              userId,
              brandId,
            );

            return signzyResponse;
          } else {
            this.logger.log("Signzy lookup unsuccessful, moving to next step");
            lastResponse = signzyResponse;
            await this.logUanToEmploymentRequest({
              userId,
              brandId,
              uan: "N/A",
              provider: BrandProviderName.SIGNZY,
              status: UanToEmploymentStatus.FAILED,
              request: { mobile: userMobileNumber },
              response: null,
              errorMessage: "No UAN found for mobile number",
            });
          }
        } else {
          this.logger.log(
            "No UAN available for Signzy lookup, moving to next step",
          );
        }
      } catch (error) {
        lastError = error;
        this.logger.warn(`Signzy lookup failed: ${error.message}`);
      }
    } else if (signzyProvider && !userMobileNumber) {
      this.logger.log(
        "Signzy provider available but no user mobile number, skipping",
      );
    } else {
      this.logger.log("Signzy provider not available, skipping");
    }

    // Step 4: Try KycKart (if KycKart is available and we have user's mobile number)
    const kycKartProvider = providers.find(
      (p) => p.provider === BrandProviderName.KYCKART,
    );
    if (kycKartProvider && userMobileNumber) {
      try {
        this.logger.log("Step 4: Trying KycKart with user mobile number...");

        // Get UAN using KycKart phone-to-UAN service
        let uanForKycKart: string | null = null;

        try {
          this.logger.log(
            `Getting UAN for user mobile: ${userMobileNumber} using KycKart`,
          );
          const uanResponse = await this.phoneToUanService.getUanByPhone(
            brandId,
            {
              mobileNumber: userMobileNumber,
              groupId: "defaultGroupId",
              checkId: "defaultCheckId",
            },
            userId,
          );

          if (uanResponse?.success && uanResponse.uan) {
            uanForKycKart = uanResponse.uan;
            this.logger.log(`Got UAN from KycKart: ${uanForKycKart}`);
          } else {
            this.logger.log("No UAN found from KycKart phone-to-UAN service");
          }
        } catch (uanError) {
          this.logger.warn(
            `Failed to get UAN from KycKart: ${uanError.message}`,
          );
        }

        if (uanForKycKart) {
          const kycKartRequest: UanToEmploymentRequest = {
            uan: uanForKycKart,
            groupId: "defaultGroupId",
            checkId: "defaultCheckId",
          };

          const kycKartResponse =
            await this.getEmploymentHistoryWithKycKart(kycKartRequest);
          await this.logUanToEmploymentRequest({
            userId,
            brandId,
            uan: uanForKycKart,
            provider: BrandProviderName.KYCKART,
            status: kycKartResponse.success
              ? UanToEmploymentStatus.SUCCESS
              : UanToEmploymentStatus.FAILED,
            request: kycKartRequest,
            response: kycKartResponse,
            errorMessage: kycKartResponse.success
              ? null
              : kycKartResponse.message,
          });

          if (
            kycKartResponse.success &&
            kycKartResponse.employmentHistory?.length > 0
          ) {
            this.logger.log(
              `KycKart lookup successful with ${kycKartResponse.employmentHistory.length} records`,
            );

            // Store results in database
            await this.storeEmploymentHistoryInDatabase(
              kycKartResponse.employmentHistory,
              kycKartResponse.employeeDetails,
              userId,
              brandId,
            );

            return kycKartResponse;
          } else {
            this.logger.log("KycKart lookup unsuccessful");
            lastResponse = kycKartResponse;
            await this.logUanToEmploymentRequest({
              userId,
              brandId,
              uan: "N/A",
              provider: BrandProviderName.KYCKART,
              status: UanToEmploymentStatus.FAILED,
              request: {
                mobile: userMobileNumber,
                groupId: "defaultGroupId",
                checkId: "defaultCheckId",
              },
              response: null,
              errorMessage: "No UAN found for mobile number",
            });
          }
        } else {
          this.logger.log("No UAN available for KycKart lookup");
        }
      } catch (error) {
        lastError = error;
        this.logger.warn(`KycKart lookup failed: ${error.message}`);
      }
    } else if (kycKartProvider && !userMobileNumber) {
      this.logger.log(
        "KycKart provider available but no user mobile number, skipping",
      );
    } else {
      this.logger.log("KycKart provider not available, skipping");
    }

    // If we get here, all providers failed
    this.logger.error("All employment history lookup attempts failed");

    if (lastResponse) {
      // Return the last response (even if unsuccessful) for debugging
      return lastResponse;
    }

    throw new HttpException(
      lastError?.message || "No Employment history found for the user",
      lastError?.status || HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Helper method to store employment history in database
   */
  private async storeEmploymentHistoryInDatabase(
    employmentHistory: any[],
    employeeDetails: any,
    userId?: string,
    brandId?: string,
  ): Promise<void> {
    if (!userId || !brandId || employmentHistory.length === 0) {
      return;
    }

    try {
      const storedRecords = [];
      for (const empRecord of employmentHistory) {
        // Transform the employment record
        const transformedRecord = this.transformEmploymentData(
          empRecord,
          employeeDetails,
        );

        // Check if this specific employment record already exists
        const existingRecord = await this.prisma.previous_employments.findFirst(
          {
            where: {
              userId,
              OR: [
                // Try to find by memberId if available
                transformedRecord.memberId
                  ? {
                      memberId: transformedRecord.memberId,
                      uanNumber: transformedRecord.uan,
                    }
                  : undefined,
                // Fallback to establishmentName and joiningDate
                {
                  establishmentName: transformedRecord.establishmentName,
                  uanNumber: transformedRecord.uan,
                  joiningDate: transformedRecord.joiningDateObj,
                },
              ].filter(Boolean) as any,
            },
          },
        );

        if (existingRecord) {
          // Update existing record
          await this.prisma.previous_employments.update({
            where: { id: existingRecord.id },
            data: {
              customerName: transformedRecord.customerName || "Unknown",
              joiningDate: transformedRecord.joiningDateObj,
              exitDate: transformedRecord.exitDateObj,
              guardianName: transformedRecord.guardianName,
              memberId: transformedRecord.memberId,
              updatedAt: new Date(),
            },
          });
          storedRecords.push({ id: existingRecord.id, action: "updated" });
        } else {
          // Create new record
          const newRecord = await this.prisma.previous_employments.create({
            data: {
              id: uuidv4(),
              userId,
              brandId,
              customerName: transformedRecord.customerName || "Unknown",
              uanNumber: transformedRecord.uan,
              memberId: transformedRecord.memberId,
              joiningDate: transformedRecord.joiningDateObj,
              exitDate: transformedRecord.exitDateObj,
              guardianName: transformedRecord.guardianName,
              establishmentName: transformedRecord.establishmentName,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          storedRecords.push({ id: newRecord.id, action: "created" });
        }
      }

      this.logger.log(
        `Stored ${storedRecords.length} employment records in database (${storedRecords.filter((r) => r.action === "created").length} created, ${storedRecords.filter((r) => r.action === "updated").length} updated)`,
      );
    } catch (dbError) {
      this.logger.error(
        `Failed to store employment records: ${dbError.message}`,
        dbError.stack,
      );
    }
  }
}

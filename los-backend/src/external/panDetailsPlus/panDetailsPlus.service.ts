import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "src/prisma/prisma.service";
import {
  BrandProviderName,
  BrandProviderType,
  document_status_enum,
  DocumentTypeEnum,
} from "@prisma/client";
import { PanDetailsPlusConfig } from "./interfaces/panDetailsPlus-config.interface";
import { searchState } from "src/constant/stateCode";
import * as dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
const _dayjs = dayjs.default;

/**
 * Unified response shape for PAN verification providers
 */
export interface PanVerificationUnifiedResponse {
  success: boolean;
  dob: string | null;
  name: string | null;
  address: string | null;
  fathersName: string | null;
  message: string;
  provider: "DIGITAP" | "SCOREME";
  raw: any;
}

/**
 * Address object structure from ScoreMe
 */
interface AddressObject {
  building_name?: string;
  locality?: string;
  street_name?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Digitap API response interface
 */
interface DigitapResponse {
  http_response_code: number;
  result_code: number;
  request_id: string;
  client_ref_num: string;
  result: {
    pan: string;
    pan_type: string;
    fullname: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    gender: string;
    aadhaar_number: string;
    aadhaar_linked: boolean;
    dob: string;
    address: {
      building_name: string;
      locality: string;
      street_name: string;
      pincode: string;
      city: string;
      state: string;
      country: string;
    };
    mobile: string;
    email: string;
  };
}

/**
 * ScoreMe API response interface
 */
interface ScoreMeResponse {
  data: {
    firstName: string;
    lastName: string;
    address: string;
    gender: string;
    aadhaarLinked: string;
    dob: string;
    fullName: string;
    maskedAadhaarNumber: string;
    category: string;
    pan: string;
  };
  referenceId: string;
  responseMessage: string;
  responseCode: string;
}

@Injectable()
export class PanDetailsPlusService {
  private readonly logger = new Logger(PanDetailsPlusService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    @Inject("PANDETAILSPLUS_CONFIG")
    private readonly config: PanDetailsPlusConfig
  ) {}

  private formatDateToDDMMYYYY(input: string): string | null {
    if (!input) return null;
    try {
      let year: number, month: number, day: number;

      // Handle MM-DD-YY format (Digitap: "01-15-00" means Jan 15, 2000)
      if (/^\d{2}-\d{2}-\d{2}$/.test(input)) {
        const [m, d, y] = input.split("-").map(Number);
        month = m;
        day = d;
        // Assume years 00-30 are 2000-2030, 31-99 are 1931-1999
        year = y <= 30 ? 2000 + y : 1900 + y;
      }
      // Handle MM-DD-YYYY format (e.g., "01-15-2000")
      else if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
        const [m, d, y] = input.split("-").map(Number);
        month = m;
        day = d;
        year = y;
      }
      // Handle DD/MM/YYYY format (e.g., "10/07/2001")
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
        const [d, m, y] = input.split("/").map(Number);
        day = d;
        month = m;
        year = y;
      }
      // Handle YYYY-MM-DD or ISO format
      else {
        const date = new Date(input);
        if (isNaN(date.getTime())) return null;
        day = date.getDate();
        month = date.getMonth() + 1;
        year = date.getFullYear();
      }

      // Validate parsed values
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

      const formattedDay = String(day).padStart(2, "0");
      const formattedMonth = String(month).padStart(2, "0");
      return `${formattedDay}-${formattedMonth}-${year}`;
    } catch (error) {
      this.logger.warn(`Failed to parse date: ${input}`, error);
      return null;
    }
  }

  /**
   * Convert address object to string
   */
  private parseAddressToString(
    address: string | AddressObject | null
  ): string | null {
    if (!address) return null;

    // If already a string, return as is
    if (typeof address === "string") {
      return address.trim() || null;
    }

    // If it's an object, construct address string
    const parts: string[] = [];

    if (address.building_name) parts.push(address.building_name);
    if (address.street_name) parts.push(address.street_name);
    if (address.locality) parts.push(address.locality);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.pincode) parts.push(address.pincode);
    if (address.country) parts.push(address.country);

    const fullAddress = parts.filter(Boolean).join(", ");
    return fullAddress || null;
  }

  /**
   * Extract city, state, and pincode from address
   */
  private extractAddressComponents(address: string | AddressObject | null): {
    fullAddress: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  } {
    if (!address) {
      return {
        fullAddress: null,
        city: null,
        state: null,
        pincode: null,
      };
    }

    // If address is an object (ScoreMe format)
    if (typeof address === "object") {
      return {
        fullAddress: this.parseAddressToString(address),
        city: address.city || null,
        state: address.state || null,
        pincode: address.pincode || null,
      };
    }

    // If address is a string (Digitap format)
    const fullAddress = address.trim();
    let city: string | null = null;
    let state: string | null = null;
    let pincode: string | null = null;

    // Try to extract pincode (6 digits)
    const pincodeMatch = fullAddress.match(/\b(\d{6})\b/);
    if (pincodeMatch) {
      pincode = pincodeMatch[1];
    }

    // Use searchState function to extract state from address
    const stateResult = searchState(fullAddress);
    if (stateResult && stateResult.value) {
      state = stateResult.value;
    }

    // City extraction is harder from string, leaving it null for now
    // You can add custom logic if needed

    return {
      fullAddress,
      city,
      state,
      pincode,
    };
  }

  /** Log request */
  private logRequest(
    provider: "Digitap" | "ScoreMe",
    pan: string,
    userId: string,
    brandId: string
  ) {
    this.logger.log(
      `[${provider}] Starting PAN verification | PAN: ${pan?.substring(0, 3)}XXX${pan?.substring(7)} | ClientRef: ${
        userId || "N/A"
      }`
    );
  }

  /** Log success */
  private logSuccess(
    provider: "Digitap" | "ScoreMe",
    pan: string,
    response: any,
    userId: string,
    brandId: string
  ) {
    const resultCode =
      provider === "Digitap"
        ? response?.result_code
        : response?.status || response?.responseCode;
    this.logger.log(
      `[${provider}] PAN verification SUCCESS | PAN: ${pan?.substring(0, 3)}XXX${pan?.substring(7)} | ResultCode: ${resultCode}`
    );
  }

  /** Log error */
  private logError(provider: "Digitap" | "ScoreMe", pan: string, error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.responseMessage ||
      error?.message ||
      "Unknown error";
    const statusCode = error?.response?.status || 500;

    this.logger.error(
      `[${provider}] PAN verification FAILED | PAN: ${pan?.substring(0, 3)}XXX${pan?.substring(7)} | Status: ${statusCode} | Error: ${errorMessage}`
    );

    if (error?.response?.data) {
      this.logger.debug(
        `[${provider}] Error details: ${JSON.stringify(error.response.data)}`
      );
    }
  }

  /** Log each PAN request/response to DB */
  private async logPanDetailsRequest(logData: {
    userId: string;
    brandId: string;
    pan: string;
    clientRefNum?: string;
    provider: BrandProviderName;
    status: "SUCCESS" | "FAILED" | "INVALID" | "PENDING";
    request: any;
    response: any;
    panHolderName?: string;
    isValid?: boolean;
    errorMessage?: string;
    aadhaarLinked?: string | boolean | null;
    aadhaarNumber?: string;
    dob?: string;
    gender?: string;
    cachedResponseData: boolean;
  }) {
    try {
      // Parse dob string to Date object if provided
      let dobDate: Date | null = null;
      if (logData.dob) {
        try {
          if (/^\d{2}-\d{2}-\d{4}$/.test(logData.dob)) {
            const [day, month, year] = logData.dob.split("-").map(Number);
            dobDate = new Date(Date.UTC(year, month - 1, day));
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(logData.dob)) {
            dobDate = new Date(logData.dob);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to parse dob for logging: ${logData.dob}`,
            error
          );
        }
      }

      await this.prisma.pan_details_log.create({
        data: {
          userId: logData.userId,
          brandId: logData.brandId,
          pan: logData.pan,
          clientRefNum: logData.clientRefNum,
          provider: logData.provider,
          status: logData.status,
          request: logData.request,
          response: logData.response || {},
          panHolderName: logData.panHolderName,
          isValid: logData.isValid,
          errorMessage: logData.errorMessage,
          aadhaarLinked: logData.aadhaarLinked === "true" || false,
          aadhaarNumber: logData.aadhaarNumber,
          dob: dobDate,
          gender: logData.gender,
          cachedResponseData: logData.cachedResponseData || false,
        },
      });
    } catch (error) {
      this.logger.error("Failed to log PAN details request:", error);
    }
  }

  /**
   * Extract and parse name components from PAN response
   */
  private parseNameComponents(fullName: string | null): {
    firstName: string;
    middleName: string | null;
    lastName: string;
  } {
    if (!fullName) {
      return { firstName: "", middleName: null, lastName: "" };
    }

    // Normalize whitespace and remove common prefixes
    const prefixBlacklist = [
      "mr",
      "ms",
      "mrs",
      "miss",
      "shri",
      "smt",
      "kumari",
      "dr",
    ];
    let name = fullName
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\./g, "") // remove periods from initials
      .toLowerCase();

    const nameParts = name
      .split(" ")
      .filter((part) => !prefixBlacklist.includes(part));
    const cleanedParts = nameParts.map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1)
    ); // Title case

    const count = cleanedParts.length;

    if (count === 0) {
      return { firstName: "", middleName: null, lastName: "" };
    }

    if (count === 1) {
      return {
        firstName: cleanedParts[0],
        middleName: null,
        lastName: cleanedParts[0], // duplicate
      };
    }

    if (count === 2) {
      return {
        firstName: cleanedParts[0],
        middleName: null,
        lastName: cleanedParts[1],
      };
    }

    // Advanced handling for 3+ parts
    // Use heuristic: Last word → last name, first word → first name, rest → middle
    const firstName = cleanedParts[0];
    const lastName = cleanedParts[count - 1];
    const middleName = cleanedParts.slice(1, -1).join(" ") || null;

    return {
      firstName,
      middleName,
      lastName,
    };
  }

  /**
   * Upsert user details based on PAN verification response
   */
  private async upsertUserDetailsFromPan(
    userId: string,
    pan: string,
    panData: {
      name: string | null;
      dob: string | null;
      address: string | AddressObject | null;
      fathersName: string | null;
      gender?: string | null;
      aadhaarLinked?: string | boolean | null;
      aadhaarNumber?: string | null;
    },
    raw: any,
    shouldUpsert: boolean = true
  ) {
    // try {
    if (!userId) {
      this.logger.warn("Cannot upsert user details: userId is missing");
      return;
    }

    if (!shouldUpsert) {
      this.logger.debug("Skipping user details upsert as requested");
      return;
    }

    // Parse name components
    const { firstName, middleName, lastName } = this.parseNameComponents(
      panData.name
    );

    // // Parse date of birth (expecting DD-MM-YYYY format from our formatter)

    let dateOfBirth: Date | null = null;
    if (panData.dob) {
      dateOfBirth = (function parseToDateObject(input: string): Date | null {
        if (!input) return null;

        try {
          let date: Date;

          if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
            const [day, month, year] = input.split("-").map(Number);
            date = new Date(Date.UTC(year, month - 1, day)); // Use UTC to avoid timezone issues
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
            date = new Date(input); // already ISO-like
          } else {
            return null; // Or throw
          }

          if (isNaN(date.getTime())) return null;
          return date;
        } catch (error) {
          this.logger?.warn?.(`Failed to parse date string: ${input}`, error);
          return null;
        }
      })(panData.dob);
    }

    // Parse address components

    const { fullAddress, city, state, pincode } = this.extractAddressComponents(
      panData.address
    );

    // Normalize gender
    let gender: "MALE" | "FEMALE" | "OTHER" | null = null;
    if (panData.gender) {
      const genderLower = panData.gender.toLowerCase();
      if (genderLower === "male" || genderLower === "m") {
        gender = "MALE";
      } else if (genderLower === "female" || genderLower === "f") {
        gender = "FEMALE";
      } else {
        gender = "OTHER";
      }
    }
    // Upsert user details
    await this.prisma.userDetails.upsert({
      where: { userId },
      update: {
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: fullAddress || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        fathersName: panData.fathersName || undefined,
        age: dateOfBirth ? _dayjs().diff(dateOfBirth, "year") : undefined,
        aadhaarPanLinkedByPanPlus: panData.aadhaarLinked === "true" || false,
        linkedAadhaarNumberByPanPlus: panData.aadhaarNumber || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: fullAddress || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        fathersName: panData.fathersName || undefined,
        age: dateOfBirth ? _dayjs().diff(dateOfBirth, "year") : undefined,
        aadhaarPanLinkedByPanPlus: panData.aadhaarLinked === "true" || false,
        linkedAadhaarNumberByPanPlus: panData.aadhaarNumber || undefined,
      },
    });

    // Log raw data for debugging purposes
    // this.logger.debug(
    //   `Raw PAN verification data for userId ${userId}:`,
    //   JSON.stringify(raw, null, 2)
    // );
    if (!pan || pan.length !== 10) {
      throw new Error("Invalid PAN format");
    }
    // FIND DUBLICATE AND REMOVE LATER
    const document = await this.prisma.document.findMany({
      where: {
        documentNumber: pan.toUpperCase(),
        type: DocumentTypeEnum.PAN,
        status: document_status_enum.APPROVED,
        user: {
          id: {
            not: userId,
          },
          isPhoneVerified: true,
        },
      },
    });
    if (document.length > 0) {
      throw new Error("PAN already in use by another verified user");
    }

    await this.prisma.document.upsert({
      where: {
        userId_type: { userId: userId, type: DocumentTypeEnum.PAN },
      },
      update: {
        providerData: raw,
        status: document_status_enum.APPROVED,
        verifiedAt: new Date(),
        documentNumber: pan.toUpperCase(),
      },
      create: {
        userId: userId,
        type: DocumentTypeEnum.PAN,
        providerData: raw,
        status: document_status_enum.APPROVED,
        verifiedAt: new Date(),
        documentNumber: pan.toUpperCase(),
      },
    });
    // this.logger.log(`Successfully upserted user details for userId: ${userId}`);
    // } catch (error) {
    // this.logger.error(
    // `Failed to upsert user details for userId: ${userId}`,
    // error
    // );
    // }
  }

  /**
   * Verify PAN using Digitap API
   */
  async verifyPanWithDigitap(
    pan: string,
    userId: string,
    brandId: string,
    shouldUpsertUserDetails: boolean = true
  ): Promise<PanVerificationUnifiedResponse> {
    const url = `${this.config.digitap.baseUrl}/validation/kyc/v1/pan_details`;
    let cachedResponseData = false;

    this.logRequest("Digitap", pan, userId, brandId);

    const requestPayload = {
      client_ref_num: uuidv4(),
      pan: pan,
    };

    try {
      const startTime = Date.now();

      const pan_details_log = await this.prisma.pan_details_log.findFirst({
        where: {
          pan: pan,
          isValid: true,
          response: { not: null },
          status: "SUCCESS",
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      let data = null;
      if (pan_details_log) {
        cachedResponseData = true;
        data = pan_details_log.response;
      } else {
        cachedResponseData = false;
        data = (
          await firstValueFrom(
            this.httpService.post<DigitapResponse>(url, requestPayload, {
              headers: {
                Authorization: this.config.digitap.authKey,
                "Content-Type": "application/json",
              },
            })
          )
        )?.data;
      }

      const duration = Date.now() - startTime;


      this.logSuccess("Digitap", pan, data, userId, brandId);
      const isValid =
        data?.result_code === 101 || data?.result?.status === "VALID";
      const status = isValid ? "SUCCESS" : "INVALID";
      if (!isValid) {
        throw new Error("Invalid PAN details");
      }
      await this.logPanDetailsRequest({
        userId,
        brandId,
        pan,
        clientRefNum: data?.client_ref_num,
        provider: BrandProviderName.DIGITAP,
        status,
        request: requestPayload,
        response: data,
        panHolderName: data?.result?.fullname || data?.result?.first_name,
        isValid,
        errorMessage: null,
        aadhaarLinked: data?.result?.aadhaar_linked === "true" || false,
        aadhaarNumber: data?.result?.aadhaar_number || null,
        dob: this.formatDateToDDMMYYYY(data?.result?.dob) || null,
        gender: data?.result?.gender || null,
        cachedResponseData: cachedResponseData,
      });
      // Upsert user details if verification was successful
      if (isValid && userId) {
        await this.upsertUserDetailsFromPan(
          userId,
          pan,
          {
            name: data?.result?.fullname || null,
            dob: this.formatDateToDDMMYYYY(data?.result?.dob) || null,
            address: data?.result?.address || null,
            fathersName: data?.result?.father_name || null,
            gender: data?.result?.gender || null,
            aadhaarLinked: data?.result?.aadhaar_linked === "true" || false,
            aadhaarNumber: data?.result?.aadhaar_number || null,
          },
          data,
          shouldUpsertUserDetails
        );
      }

      return {
        success: isValid,
        dob: this.formatDateToDDMMYYYY(data?.result?.dob) || null,
        name: data?.result?.fullname || null,
        address: this.parseAddressToString(data?.result?.address) || null,
        fathersName: data?.result?.father_name || null,
        message: isValid ? "Verification successful" : "Verification failed",
        provider: "DIGITAP",
        raw: data,
      };
    } catch (error) {
      this.logError("Digitap", pan, error);

      await this.logPanDetailsRequest({
        userId,
        brandId,
        pan,
        clientRefNum: userId || null,
        provider: BrandProviderName.DIGITAP,
        status: "FAILED",
        request: requestPayload,
        response: error?.response?.data || null,
        panHolderName: null,
        isValid: false,
        errorMessage:
          error?.response?.data?.message ||
          error?.response?.data?.result_message ||
          error?.message ||
          "Unknown error",
        aadhaarLinked: null,
        aadhaarNumber: null,
        dob: null,
        gender: null,
        cachedResponseData: cachedResponseData,
      });

      throw new HttpException(

        error?.response?.data || 
        error||
        "Failed to verify PAN with Digitap",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify PAN using ScoreMe API
   */
  async verifyPanWithScoreMe(
    pan: string,
    userId: string,
    brandId: string,
    shouldUpsertUserDetails: boolean = true
  ): Promise<PanVerificationUnifiedResponse> {
    const url = `${this.config.scoreMe.baseUrl}/kyc/external/panDetailInfo`;
    let cachedResponseData = false;
    this.logRequest("ScoreMe", pan, userId, brandId);

    const requestPayload = {
      pan: pan,
    };

    try {
      const startTime = Date.now();
      const pan_details_log = await this.prisma.pan_details_log.findFirst({
        where: {
          pan: pan,
          isValid: true,
          response: { not: null },
          status: "SUCCESS",
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      let data = null;
      if (pan_details_log) {
        cachedResponseData = true;
        data = pan_details_log.response;
      } else {
        cachedResponseData = false;
        data = (
          await firstValueFrom(
            this.httpService.post<ScoreMeResponse>(url, requestPayload, {
              headers: {
                clientId: this.config.scoreMe.clientId,
                clientSecret: this.config.scoreMe.clientSecret,
                "Content-Type": "application/json",
              },
            })
          )
        )?.data;
      }
      const duration = Date.now() - startTime;
  

      this.logSuccess("ScoreMe", pan, data, userId, brandId);

      const isValid =
        data?.status === "SUCCESS" || data?.responseCode === "SRC001";
      const status = isValid ? "SUCCESS" : "INVALID";
      if (!isValid) {
        throw new Error("Invalid PAN details");
      }

      await this.logPanDetailsRequest({
        userId,
        brandId,
        pan,
        clientRefNum: data?.referenceId,
        provider: BrandProviderName.SCOREME,
        status,
        request: requestPayload,
        response: data,
        panHolderName: data?.data?.fullName || data?.data?.firstName,
        isValid,
        errorMessage: null,
        aadhaarLinked: data?.data?.aadhaarLinked === "true" || false,
        aadhaarNumber: data?.data?.maskedAadhaarNumber || null,
        dob: this.formatDateToDDMMYYYY(data?.data?.dob) || null,
        gender: data?.data?.gender || null,
        cachedResponseData: cachedResponseData,
      });

      // Upsert user details if verification was successful
      if (isValid && userId) {
        await this.upsertUserDetailsFromPan(
          userId,
          pan,
          {
            name: data?.data?.fullName || null,
            dob: this.formatDateToDDMMYYYY(data?.data?.dob) || null,
            address: data?.data?.address || null,
            fathersName: data?.data?.fatherName || null,
            gender: data?.data?.gender || null,
            aadhaarLinked: data?.data?.aadhaarLinked === "true" || false,
            aadhaarNumber: data?.data?.aadhaarNumber || null,
          },
          data,
          shouldUpsertUserDetails
        );
      }

      return {
        success: isValid,
        dob: this.formatDateToDDMMYYYY(data?.data?.dob) || null,
        name: data?.data?.fullName || null,
        address: this.parseAddressToString(data?.data?.address) || null,
        fathersName: data?.data?.fatherName || null,
        message: isValid ? "Verification successful" : "Verification failed",
        provider: "SCOREME",
        raw: data,
      };
    } catch (error) {
      this.logError("ScoreMe", pan, error);

      await this.logPanDetailsRequest({
        userId,
        brandId,
        pan,
        clientRefNum: userId || null,
        provider: BrandProviderName.SCOREME,
        status: "FAILED",
        request: requestPayload,
        response: error?.response?.data || null,
        panHolderName: null,
        isValid: false,
        errorMessage:
          error?.response?.data?.responseMessage ||
          error?.response?.data?.message ||
          error?.message ||
          "Unknown error",
        aadhaarLinked: null,
        aadhaarNumber: null,
        dob: null,
        gender: null,
        cachedResponseData: cachedResponseData,
      });

      throw new HttpException(
        error?.response?.data || "Failed to verify PAN with ScoreMe",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify PAN using both providers and return both results
   */
  async verifyPanBoth(
    pan: string,
    userId: string,
    brandId: string,
    shouldUpsertUserDetails: boolean = true
  ): Promise<{
    digitap: PanVerificationUnifiedResponse | null;
    scoreMe: PanVerificationUnifiedResponse | null;
  }> {
    this.logger.log(
      `[Both] Starting dual PAN verification | PAN: ${pan?.substring(0, 3)}XXX${pan?.substring(7)} | ClientRef: ${
        userId || `N/A`
      }`
    );

    const [digitapResult, scoreMeResult] = await Promise.allSettled([
      this.verifyPanWithDigitap(pan, userId, brandId, shouldUpsertUserDetails),
      this.verifyPanWithScoreMe(pan, userId, brandId, shouldUpsertUserDetails),
    ]);

    const result = {
      digitap:
        digitapResult.status === "fulfilled" ? digitapResult.value : null,
      scoreMe:
        scoreMeResult.status === "fulfilled" ? scoreMeResult.value : null,
    };

    this.logger.log(
      `[Both] Dual verification completed | Digitap: ${digitapResult.status} | ScoreMe: ${scoreMeResult.status}`
    );

    return result;
  }

  /**
   * Verify PAN with fallback logic among configured providers
   */
  async verifyPanWithFallback(
    pan: string,
    userId: string,
    brandId: string,
    shouldUpsertUserDetails: boolean = true
  ): Promise<PanVerificationUnifiedResponse> {
    const providers = await this.prisma.brandProvider.findMany({
      where: {
        brandId,
        type: BrandProviderType.PAN_DETAILS_PLUS,
        isActive: true,
        isDisabled: false,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    if (providers.length === 0) {
      throw new HttpException(
        "No active PAN verification provider configured for this brand",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    let lastError: any = null;

    for (const provider of providers) {
      try {
        this.logger.log(
          `Attempting PAN verification with ${provider.provider} (Primary: ${provider.isPrimary})`
        );

        let response: PanVerificationUnifiedResponse;

        if (provider.provider === BrandProviderName.DIGITAP) {
          response = await this.verifyPanWithDigitap(
            pan,
            userId,
            brandId,
            shouldUpsertUserDetails
          );
        } else if (provider.provider === BrandProviderName.SCOREME) {
          response = await this.verifyPanWithScoreMe(
            pan,
            userId,
            brandId,
            shouldUpsertUserDetails
          );
        } else {
          this.logger.warn(`Unsupported provider: ${provider.provider}`);
          continue;
        }

        this.logger.log(
          `PAN verification succeeded with ${provider.provider} | success: ${response.success}`
        );
        return response;
      } catch (err) {
        lastError = err;
        this.logger.error(
          `Provider ${provider.provider} failed, trying next provider...`,
          err.message
        );
        continue;
      }
    }

    throw new HttpException(
      lastError?.message || "All PAN verification providers failed",
      lastError?.status || HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  /**
   * Get PAN details logs for a brand
   */
  async getPanDetailsLogs(
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
      this.prisma.pan_details_log.findMany({
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
      this.prisma.pan_details_log.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }
}

import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import axios from "axios";
import { PrismaService } from "src/prisma/prisma.service";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { IndianStatesWithCapitals } from "src/constant/stateCode";
import { HttpService } from "@nestjs/axios";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { firstValueFrom } from "rxjs";
// TypeScript interfaces for ScoreMe BDA

export interface BdaInitiateResponse {
  data: {
    referenceId: string;
  };
  responseMessage: string;
  responseCode: string;
}

export interface BdaOtpValidationResponse {
  data: {
    referenceId: string;
  };
  responseMessage: string;
  responseCode: string;
  vendorResponseMessage: string;
}

export interface BdaReportData {
  data: {
    excelUrl: string;
    jsonUrl: string;
    referenceId: string;
    bdaReportXlsxPrivateKey: string; // Optional, if private key is not always provided
  };
  responseMessage: string;
  responseCode?: string; // Add this if responseCode is expected
}

@Injectable()
export class ScoreMeBdaService {
  private readonly logger = new Logger(ScoreMeBdaService.name);

  private baseUrl = "https://sm-bda.scoreme.in";
  private clientId = process.env.SCOREME_BDA_CLIENT_ID || "YOUR_CLIENT_ID";
  private clientSecret =
    process.env.SCOREME_BDA_CLIENT_SECRET || "YOUR_CLIENT_SECRET";

  constructor(
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly awsS3Service: AwsPublicS3Service,
  ) {}

  private getHeaders(extraHeaders?: Record<string, string>) {
    return {
      ClientId: this.clientId,
      ClientSecret: this.clientSecret,
      ...(extraHeaders || {}),
    };
  }

  async initiateRetailRequest(
    userId: string,
    body: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      address?: string;
      state?: string;
      pincode?: string;
      city?: string;
      mobileNumber?: string;
      panNumber?: string;
      dateOfBirth?: string;
    },
  ): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        userDetails: true,
        documents: {
          where: { type: "PAN" },
          select: { documentNumber: true },
        },
      },
    });
    if (!user || !user.userDetails) {
      throw new HttpException("User details not found", HttpStatus.NOT_FOUND);
    }
    const startOfMonth = _dayjs().startOf("month").toDate();

    const existingReport = await this.prismaService.bdaReport.findFirst({
      where: {
        userId,
        generatedMonth: startOfMonth,
      },
    });
    if (
      Object.keys(body).length > 0 &&
      body.mobileNumber.length > 5 &&
      existingReport?.status !== "report_generation_in_progress"
    ) {
      await this.prismaService.bdaReport.deleteMany({
        where: {
          userId,
        },
      });
    }

    if (existingReport?.referenceId) {
      if (existingReport.status === "report_generation_in_progress") {
        // this.logger.log(
        //   `BDA report already exists for user ${userId} for this month. Returning existing report.`,
        // );
        return existingReport;
      } else if (existingReport.status === "otp_verification_in_progress") {
        const createdAt = _dayjs(existingReport.createdAt);
        // expiration time is 10 minutes
        const expirationTime = createdAt.add(10, "minute");
        if (existingReport.status === "otp_verification_in_progress") {
          // less then 10 minutes
          if (_dayjs().isBefore(expirationTime)) {
            // this.logger.log(
            //   `Resending OTP for existing BDA report for user ${userId} for this month.`,
            // );
            return await this.resendOtp(existingReport.referenceId);
          } else {
            // this.logger.log(
            //   `OTP for existing BDA report for user ${userId} has expired. Initiating new request.`,
            // );
            await this.prismaService.bdaReport.delete({
              where: { id: existingReport.id },
            });
            await this.prismaService.bdaReport.deleteMany({
              where: {
                userId,
              },
            });
            // Proceed to create a new BDA report
          }
        }
      }
    }

    const indianStatesWithCapital = IndianStatesWithCapitals.find(
      (state) => state.value === user.userDetails.state,
    );

    const dateOfBirth = user.userDetails?.dateOfBirth
      ? _dayjs(user.userDetails.dateOfBirth).format("YYYY-MM-DD")
      : "";
    const payload: {
      bureauName: string[];
      firstName: string;
      middleName: string;
      lastName: string;
      addressList: {
        address: string;
        state: string;
        pinCode: string;
        city: string;
      }[];
      mobileList: string[];
      identityList: string[];
      dateOfBirth: string;
      gender: string;
      referenceIdFlag: string;
      vendorResponseFlag: string;
      applicationId: string;
    } = !!(body?.mobileNumber.length > 5)
      ? {
          bureauName: ["equifax"],
          firstName: body.firstName?.trim() || "",
          middleName: body.middleName?.trim() || "",
          lastName: body.lastName?.trim() || "",
          addressList: [
            {
              address:
                body.address?.replace(/\s+/g, " ").trim() ||
                user.userDetails.address?.replace(/\s+/g, " ").trim() ||
                "",
              state:
                body.state?.trim() || indianStatesWithCapital?.code || "KA",
              pinCode:
                body.pincode?.trim() || user.userDetails.pincode?.trim() || "",
              city: body.city?.trim() || user.userDetails.city?.trim() || "",
            },
          ],
          mobileList: [
            body.mobileNumber?.trim() || body.mobileNumber?.startsWith("+91")
              ? body.mobileNumber.substring(3).trim()
              : body.mobileNumber?.trim() || "",
          ],
          identityList: [
            body.panNumber?.trim() ||
              user.documents?.[0]?.documentNumber?.trim() ||
              "",
          ],
          dateOfBirth: _dayjs(body.dateOfBirth).format("YYYY-MM-DD"),
          gender: user.userDetails.gender === "MALE" ? "M" : "F",
          referenceIdFlag: "1",
          vendorResponseFlag: "1",
          applicationId: `APP_${userId}_${Date.now()}`,
        }
      : {
          bureauName: ["equifax"],
          firstName: user.userDetails.firstName?.trim() || "",
          middleName: user.userDetails.middleName?.trim() || "",
          lastName: user.userDetails.lastName?.trim() || "",
          addressList: [
            {
              address:
                user.userDetails.address?.replace(/\s+/g, " ").trim() || "",
              state: indianStatesWithCapital?.code || "KA",
              pinCode: user.userDetails.pincode?.trim() || "",
              city: user.userDetails.city?.trim() || "",
            },
          ],
          mobileList: [
            user.phoneNumber?.startsWith("+91")
              ? user.phoneNumber.substring(3)
              : user.phoneNumber,
          ],
          identityList: [user.documents?.[0]?.documentNumber?.trim() || ""],
          dateOfBirth: dateOfBirth,
          gender: user.userDetails.gender === "MALE" ? "M" : "F",
          referenceIdFlag: "1",
          vendorResponseFlag: "1",
          applicationId: `APP_${userId}_${Date.now()}`,
        };
    function validatePayload(payload: any) {
      const errors: string[] = [];

      if (
        !payload.firstName
        // ||
        // !/^[A-Z .,'";:_(){}\[\]<>/\\]+$/i.test(payload.firstName)
      ) {
        errors.push("Invalid or missing First Name.");
      }

      if (
        !payload.lastName
        //  ||
        // !/^[A-Z .,'";:_(){}\[\]<>/\\]+$/i.test(payload.lastName)
      ) {
        errors.push("Invalid or missing Last Name.");
      }

      const address = payload.addressList?.[0];
      if (!address || !address.address) {
        errors.push("Invalid Address. Must be 10 to 220 characters.");
      }

      if (!address.state || address.state.length > 3) {
        errors.push("Invalid State Code.");
      }

      if (!address.pinCode || !/^\d{6}$/.test(address.pinCode)) {
        errors.push("Invalid Pincode. Must be exactly 6 digits.");
      }

      if (!address || !address.city) {
        errors.push("Invalid or missing City.");
      }

      if (!payload.mobileList?.[0] || !/^\d{10}$/.test(payload.mobileList[0])) {
        errors.push("Invalid Mobile Number. Must be exactly 10 digits.");
      }

      if (
        !payload.identityList?.[0] ||
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(payload.identityList[0])
      ) {
        errors.push("Invalid PAN Number.");
      }

      if (
        !payload.dateOfBirth ||
        !/^\d{4}-\d{2}-\d{2}$/.test(payload.dateOfBirth)
      ) {
        errors.push("Invalid Date of Birth. Must be in YYYY-MM-DD format.");
      }

      if (!["M", "F", "T"].includes(payload.gender)) {
        errors.push("Invalid Gender.");
      }

      if (errors.length) {
        throw new BadRequestException({
          message: "Payload validation failed.",
          errors,
        });
      }
    }

    validatePayload(payload);

    const response = await axios.post(
      `${this.baseUrl}/bda/external/retail`,
      payload,
      { headers: this.getHeaders() },
    );
    const responseData = response.data;

    // this.logger.log("BDA Response: " + JSON.stringify(responseData));

    if (responseData?.responseCode?.startsWith("E")) {
      throw new HttpException(
        responseData.responseMessage || "BDA Request Failed",
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.prismaService.bdaReport.create({
      data: {
        userId,
        brandId: user.brandId,
        referenceId: responseData.data.referenceId,
        jsonUrl: null,
        excelUrl: null,
        generatedMonth: startOfMonth,
        status: "otp_verification_in_progress",
      },
    });
  }

  async validateOtp(referenceId: string, otp: string) {
    try {
      // this.logger.log(
      //   `Validating OTP for Reference ID: ${referenceId}, OTP: ${otp}`,
      // );
      const response = await axios.post(
        `${this.baseUrl}/bda/external/validateotp`,
        { referenceId, otp },
        { headers: this.getHeaders() },
      );

      const responseData = response.data;
      // this.logger.log("BDA OTP Response: " + JSON.stringify(responseData));

      if (responseData?.responseCode?.startsWith("E")) {
        throw new HttpException(
          responseData.vendorResponseMessage ||
            responseData.responseMessage ||
            "OTP Validation Failed",
          responseData.responseCode,
        );
      }
      return await this.prismaService.bdaReport.update({
        where: { referenceId },
        data: { status: "report_generation_in_progress" },
      });
    } catch (error) {
      this.handleAxiosError(error, "validateOtp");
    }
  }

  async getBdaReport(referenceId: string) {
    try {
      if (!referenceId) {
        throw new HttpException(
          "Reference ID is required",
          HttpStatus.BAD_REQUEST,
        );
      }
      const existingReport = await this.prismaService.bdaReport.findUnique({
        where: { referenceId },
      });
      if (!existingReport) {
        throw new HttpException(
          "BDA Report not found for the given reference ID",
          HttpStatus.NOT_FOUND,
        );
      }
      // this.logger.log(`Fetching BDA Report for Reference ID: ${referenceId}`);
      const response =
        existingReport?.excelUrl && existingReport?.jsonUrl
          ? {
              data: {
                data: {
                  excelUrl: existingReport?.excelUrl || null,
                  jsonUrl: existingReport?.jsonUrl || null,
                  referenceId: existingReport.referenceId,
                },
                responseMessage: "BDA Report already generated",
                responseCode: "SRC001",
              },
            }
          : await axios.get(`${this.baseUrl}/bda/external/getbdareport`, {
              headers: this.getHeaders(),
              params: { referenceId },
            });
      const responseData = response?.data;
      // this.logger.log("BDA Report Response: " + JSON.stringify(responseData));
      // Check if responseData and responseData.data are defined
      if (!responseData || !responseData?.data) {
        throw new HttpException(
          "Please wait for the report to be generated. Try again after 2 minutes. After that, click on the 'Fetch Report' button. If you don't see the 'Fetch Report' button, please wait for 2 minutes, refresh the page, and then click on the 'Get Instant Report' button.",
          HttpStatus.BAD_REQUEST,
        );
      }
      // this.logger.log("BDA Report Response: " + JSON.stringify(responseData));

      // Check if responseCode starts with "E" to indicate an error
      if (responseData?.responseCode?.startsWith("E")) {
        throw new HttpException(
          responseData.vendorResponseMessage ||
            responseData.responseMessage ||
            "BDA Report Fetch Failed",
          HttpStatus.BAD_REQUEST,
        );
      }

      if (responseData.data.jsonUrl && responseData.data.excelUrl) {
        existingReport.jsonUrl = responseData.data.jsonUrl;
        existingReport.excelUrl = responseData.data.excelUrl;
        await this.prismaService.bdaReport.update({
          where: { referenceId },
          data: {
            jsonUrl: responseData.data.jsonUrl || null,
            excelUrl: responseData.data.excelUrl || null,
          },
        });
      }

      await this.downloadReport(existingReport.userId, referenceId, "xlsx");
      await this.downloadReport(existingReport.userId, referenceId, "json");

      return await this.prismaService.bdaReport.findUnique({
        where: { referenceId },
      });
    } catch (error) {
      this.handleAxiosError(error, "getBdaReport");
    }
  }

  private handleAxiosError(error: any, context: string) {
    this.logger.error(
      `Error in ${context}: ${error?.response?.data?.responseMessage || error.message}`,
    );

    if (error?.response?.data) {
      throw new HttpException(
        {
          message:
            error.response.data.responseMessage ||
            error.response.data.message ||
            "BDA API Error",
          code: error.response.data.responseCode || "UNKNOWN_ERROR",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async downloadReport(
    userId: string,
    referenceId: string,
    type: "xlsx" | "json",
  ) {
    if (!["xlsx", "json"].includes(type) || !referenceId) {
      throw new HttpException("Invalid input", HttpStatus.BAD_REQUEST);
    }
    const dsaReport = await this.prismaService.bdaReport.findUnique({
      where: { referenceId },
    });

    const url = type === "xlsx" ? dsaReport.excelUrl : dsaReport.jsonUrl;
    const headers = this.getHeaders({
      "Content-Type": type === "xlsx" ? "text/plain" : "text/plain",
      Accept: type === "xlsx" ? "application/octet-stream" : "application/json",
    });

    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        headers,
        responseType: type === "xlsx" ? "arraybuffer" : "json",
      }),
    );
    if (type === "json" && data) {
      await this.prismaService.bdaReport.update({
        where: { referenceId: referenceId },
        data: { jsonResponse: JSON.stringify(data) },
      });
    }
    if (type === "xlsx" && data) {
      const uploadResult = await this.awsS3Service.uploadBufferToS3(
        Buffer.from(data),
        dsaReport.brandId,
        userId,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        { originalname: `${referenceId}.xlsx` },

        "bank-statement",
      );
      if (!uploadResult) {
        throw new HttpException(
          "Failed to upload to S3",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      await this.prismaService.bdaReport.update({
        where: { referenceId: referenceId },
        data: {
          bdaReportXlsxPrivateKey: uploadResult.key,
        },
      });
    }

    return true;
  }

  async resendOtp(referenceId: string) {
    if (!referenceId) {
      throw new HttpException(
        "Reference ID is required",
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/bda/external/resendotp`,
        { referenceId },
        { headers: this.getHeaders() },
      );

      const responseData = response.data;
      // this.logger.log(
      //   "BDA Resend OTP Response: " + JSON.stringify(responseData),
      // );

      if (responseData?.responseCode?.startsWith("E")) {
        throw new HttpException(
          responseData.responseMessage || "OTP Resend Failed",
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.prismaService.bdaReport.update({
        where: { referenceId },
        data: { status: "report_generation_in_progress" },
      });
    } catch (error) {
      this.handleAxiosError(error, "resendOtp");
    }
  }
}

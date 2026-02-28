// src/digitap/digitap.service.ts
import { Injectable, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { DigitapConfig } from "./interfaces/digitap-config.interface";
import {
  AadhaarKycApiResponse,
  AadhaarResponse,
  DigitapUnifiedUrlResponse,
  MobileToAccountDetails,
  MobiletoPrefill,
  PANDetailsPlus,
} from "src/libs/interfaces/digitap";
import { PrismaService } from "src/prisma/prisma.service";
import { v4 as uuidV4 } from "uuid";

@Injectable()
export class DigitapService {
  constructor(
    private readonly httpService: HttpService,
    @Inject("DIGITAP_CONFIG") private readonly config: DigitapConfig,
    private readonly prismaService: PrismaService,
  ) { }

  private getHeaders() {
    return {
      authorization: this.config.authKey || "your_api_key_here",
      "Content-Type": "application/json",
      // "User-Agent": "curl/7.68.0",
    };
  }
  // {{BASE_URL_SVC}}/ent/v3/kyc/intiate-kyc-auto
  async initiateAadhaarOtp(
    aadhaarNumber: string,
    userId: string,
    brandId: string,
  ) {
    const url = `${this.config.baseUrl}/ent/v3/kyc/intiate-kyc-auto`;
    //     Client ID : 61002421
    // Client Secret : vYJ2x1fDnC9VOnVYYZXOcLloRRPbiXSB
    // const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            uniqueId: "1234", // Adjust as needed if dynamic
            uid: aadhaarNumber, // Aadhaar number
          },
          { headers: this.getHeaders() },
        ),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId: userId, // Adjust type casting if necessary
            brandId: brandId,
          },
        },
        update: {
          intiateKycAuto: data,
        },
        create: {
          intiateKycAuto: data,
          userId: userId, // Adjust type casting if necessary
          brandId: brandId,
        },
      });
      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to initiate Aadhaar OTP",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{BASE_URL_SVC}}/ent/v3/kyc/submit-otp
  async verifyAadhaarOtp(
    userId: string,
    brandId: string,
    otp: string,
    transactionId: string,
    fwdp: string,
    codeVerifier: string,
  ): Promise<AadhaarResponse> {
    const url = `${this.config.baseUrl}/ent/v3/kyc/submit-otp`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            shareCode: "1234",
            validateXml: true,
            otp: otp,
            transactionId: transactionId,
            fwdp: fwdp,
            codeVerifier: codeVerifier,
          },
          { headers: this.getHeaders() },
        ),
      );

      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId: userId, // Adjust type casting if necessary
            brandId: brandId,
          },
        },
        update: {
          submitOtp: data,
        },
        create: {
          submitOtp: data,
          userId: userId, // Adjust type casting if necessary
          brandId: brandId,
        },
      });

      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to verify Aadhaar OTP",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // <base_url>/validation/misc/v1/mobile-account-lookup
  async mobileAccountLookup(
    userId: string,
    brandId: string,
    mobile: string,
  ): Promise<MobileToAccountDetails> {
    const url = `${this.config.baseUrl}/validation/misc/v1/mobile-account-lookup`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            client_ref_num: userId,
            mobile: mobile.startsWith("+91") ? mobile.substring(3) : mobile,
          },
          { headers: this.getHeaders() },
        ),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId, // Adjust type casting if necessary
            brandId,
          },
        },
        update: {
          mobileAccountLookup: data,
        },
        create: {
          mobileAccountLookup: data,
          userId, // Adjust type casting if necessary
          brandId,
        },
      });
      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to verify Mobile",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // UAT/DEMO Env https://svcdemo.digitap.work/mobile_prefill/request
  async mobilePrefill(
    userId: string,
    brandId: string,
    mobile: string,
  ): Promise<MobiletoPrefill> {
    const url = `${this.config.baseUrl}/mobile_prefill/request`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            client_ref_num: userId,
            mobile_no: mobile.startsWith("+91") ? mobile.substring(3) : mobile,
            name_lookup: 1,
          },
          { headers: this.getHeaders() },
        ),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId: userId, // Adjust type casting if necessary
            brandId: brandId,
          },
        },
        update: {
          mobilePrefill: data,
        },
        create: {
          mobilePrefill: data,
          userId: userId, // Adjust type casting if necessary
          brandId: brandId,
        },
      });
      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to verify Mobile",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // verifyAadhaar
  async verifyPAN(
    userId: string,
    brandId: string,
    pan: string,
  ): Promise<PANDetailsPlus> {
    // https://svcdemo.digitap.work/validation/kyc/v1/pan_details_plus
    const url = `${this.config.baseUrl}/validation/kyc/v1/pan_details_plus`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            client_ref_num: `${userId}`,
            pan: `${pan}`,
          },
          { headers: this.getHeaders() },
        ),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId, // Adjust type casting if necessary
            brandId,
          },
        },
        update: {
          panDetailsPlus: data,
        },
        create: {
          panDetailsPlus: data,
          userId, // Adjust type casting if necessary
          brandId,
        },
      });
      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to verify PAN! try again later",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // /penny-drop/v2/check-valid
  async pennyDrop(
    userId: string,
    brandId: string,
    accountNumber: string,
    bankAddress: string,
    accountHolderName: string,
    ifscCode: string,
  ): Promise<any> {
    const url = `${process.env.DIGITAP_PENNY_DROP_API
      }/penny-drop/v2/check-valid`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            ifsc: ifscCode,
            accNo: accountNumber,
            benificiaryName: accountHolderName,
            address: bankAddress,
            clientRefNum: userId,
          },
          {
            headers: {
              ent_authorization: this.config.authKey || "your_api_key_here",
              "Content-Type": "application/json",
            },
          },
        ),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId, // Adjust type casting if necessary
            brandId,
          },
        },
        update: {
          pennyDropResponse: data,
        },
        create: {
          pennyDropResponse: data,
          userId, // Adjust type casting if necessary
          brandId,
        },
      });
      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to verify Penny Drop",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //penny-drop/v2/check-status?transactionId=ca3059a5f8374ce5bc77c91ceb626489
  async pennyDropStatus(
    userId: string,
    brandId: string,
    transactionId: string,
  ): Promise<any> {
    const url = `${process.env.DIGITAP_PENNY_DROP_API
      }/penny-drop/v2/check-status?transactionId=${transactionId}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
        }),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId: transactionId, // Adjust type casting if necessary
            brandId: transactionId,
          },
        },
        update: {
          pennyDropStatus: data,
        },
        create: {
          pennyDropStatus: data,
          userId: userId, // Adjust type casting if necessary
          brandId: brandId,
        },
      });
      return data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to verify Penny Drop",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ⬇️ NEW: Selfie/Face match verification
  async verifySelfieWithId(
    idImageBuffer: Buffer,
    selfieImageBuffer: Buffer,
  ): Promise<boolean> {
    const url = `${this.config.baseUrl}/ent/v3/face-match`;

    const payload = {
      id_image: idImageBuffer.toString("base64"),
      selfie_image: selfieImageBuffer.toString("base64"),
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: this.getHeaders(),
        }),
      );

      // Assume API returns `similarity` or `is_match`
      if (data?.similarity >= 90 || data?.is_match === true) {
        return true;
      }

      return false;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || "Failed to verify face match",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ⬇️ Unified Digital KYC: Generate KYC URL
  async generateUnifiedKycUrl(
    userId: string,
    brandId: string,
  ): Promise<DigitapUnifiedUrlResponse> {
    const url = `${this.config.baseUrl}/kyc-unified/v1/generate-url/`;
    const basicAuth = process.env.DIGITAP_AADHAAR_UNIFIED_AUTH_KEY || '';

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        brandSubDomain: true, brand: {
          include: {
            brand_sub_domains: {
              where: { isPrimary: true }
            }
          }
        }
      }
    });
    
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }
    const domain = user?.brandSubDomain?.subdomain || user?.brand?.brand_sub_domains?.[0]?.subdomain
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            uniqueId: uuidV4(),
            redirectionUrl:
              `https://${domain}/loan-application/verify-aadhaar/${brandId}/${userId}/${
                user?.onboardingStep || 1
              }`,
              expiryHours: 72, // Optional, default is 72
          },
          {
            headers: {
              Authorization: `Basic ${basicAuth}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId: userId, 
            brandId: brandId,
          },
        },
        update: {
          kycUnifiedv1GenerateUrl: data,
        },
        create: {
          kycUnifiedv1GenerateUrl: data,
          userId: userId, 
          brandId: brandId,
        },
      });
      return data;
    } catch (error) {
      console.error("Generate KYC URL Error:", error?.response?.data || error);
      throw new HttpException(
        error?.response?.data || "Failed to generate KYC URL",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUnifiedKycDetails(
    userId: string,
    brandId: string,
    unifiedTransactionId: string,
  ): Promise<AadhaarKycApiResponse> {
    const url = `${this.config.baseUrl}/kyc-unified/v1/${unifiedTransactionId}/details/`;
    // Digitap Basic Auth
    const basicAuth = process.env.DIGITAP_AADHAAR_UNIFIED_AUTH_KEY || '';
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
        }),
      );
      await this.prismaService.digitapSomeTable.upsert({
        where: {
          userId_brandId: {
            userId: userId, // Adjust type casting if necessary
            brandId: brandId,
          },
        },
        update: {
          kycUnifiedv1Details: data,
        },
        create: {
          kycUnifiedv1Details: data,
          userId: userId, // Adjust type casting if necessary
          brandId: brandId,
        },
      });
      return data;
    } catch (error) {
      console.error("Get KYC Details Error:", error?.response?.data || error);
      throw new HttpException(
        error?.response?.data || "Failed to fetch KYC details",
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

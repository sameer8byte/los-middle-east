import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import { KycService } from "./web.kyc.service";
import { CreateKycDto } from "./dto/kyc.dto";
import { AuthType } from "src/common/decorators/auth.decorator";
import { CreateAddharKycDocumentUploadDto } from "./dto/addhar-kyc-document-upload.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreateAlternatePhoneNumberDto } from "./dto/alternate-phone-number.dto";

@Controller("web/kyc")
@AuthType("web")
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post(":userId/aadhaar")
  @HttpCode(HttpStatus.OK)
  async aadhaar(@Param("userId") userId: string, @Body() dto: CreateKycDto) {
    return this.kycService.aadhaar(userId, dto);
  }
  // v2 - verify aadhar using digitap service
  @Post(":userId/aadhaar-kyc-verify")
  @HttpCode(HttpStatus.OK)
  async verifyAadharKyc(
    @Param("userId") userId: string,
    @Body()
    dto: {
      brandId: string; // UUID of the brand
      userId: string; // UUID of the user
    }
  ) {
    return this.kycService.verifyAadharKyc(userId, dto.brandId);
  }

  // Get recent DigiLocker URLs for a user
  @Post(":userId/aadhaar-kyc-recent-urls")
  @HttpCode(HttpStatus.OK)
  async getRecentDigiLockerUrls(
    @Param("userId") userId: string,
    @Body()
    dto: {
      brandId: string; // UUID of the brand
      userId: string; // UUID of the user
    }
  ) {
    return this.kycService.getRecentDigiLockerUrls(userId, dto.brandId);
  }

  @Post(":userId/aadhaar-verify")
  @AuthType("public")
  @HttpCode(HttpStatus.OK)
  async aadhaarVerify(
    @Param("userId") userId: string,
    @Body()
    dto: {
      userId: string; // UUID of the user
    }
  ) {
    return this.kycService.verifyAadhar(userId);
  }

  @Post(":userId/aadhaar-document-upload")
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.OK)
  async aadhaarDocumentUpload(
    @Param("userId") userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() data: Omit<CreateAddharKycDocumentUploadDto, "userId">
  ) {
    return this.kycService.aadharDocumentUpload({ ...data, userId, file });
  }

  @Post(":userId/pan")
  @HttpCode(HttpStatus.OK)
  async pan(@Param("userId") userId: string, @Body() dto: CreateKycDto) {
    return this.kycService.pan(userId, dto);
  }

  //initiateAlternatePhoneNumberVerification
  @Post(":userId/alternate-phone-number")
  @HttpCode(HttpStatus.OK)
  async initiateAlternatePhoneNumberVerification(
    @Param("userId") userId: string,
    @Body() dto: CreateAlternatePhoneNumberDto
  ) {
    return this.kycService.initiateAlternatePhoneNumberVerification(
      userId,
      dto
    );
  }

  @Post(":userId/alternate-phone-number/verify")
  @HttpCode(HttpStatus.OK)
  async verifyAlternatePhoneNumber(
    @Param("userId") userId: string,
    @Body()
    dto: {
      id: string; // id of the alternate phone number
      otp: string;
    }
  ) {
    return this.kycService.verifyAlternatePhoneNumber(userId, dto);
  }

  //manualPanUpload
  @Post(":userId/manual-pan-upload")
  @HttpCode(HttpStatus.OK)
  async manualPanUpload(
    @Param("userId") userId: string,
    @Body()
    data: {
      userId: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      dateOfBirth: string;
    }
  ) {
    return this.kycService.manualPanUpload({ ...data, userId });
  }
}

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Param,
} from "@nestjs/common";
import { DigiLocker20Service } from "./digiLocker2.0.service";
import { CreateDigiLockerUrlDto } from "./dto/common-digilocker.dto";
import { SignzyCallbackDto } from "./dto/signzy-callback.dto";
import { AuthType } from "src/common/decorators/auth.decorator";

@Controller("partner/brand/:brandId/digilocker")
export class DigiLocker20Controller {
  constructor(private readonly digiLocker20Service: DigiLocker20Service) {}

  /**
   * Create DigiLocker URL using Signzy
   * POST /partner/brand/:brandId/digilocker/signzy/create-url
   */
  @AuthType("partner")
  @Post("signzy/create-url")
  @HttpCode(HttpStatus.OK)
  async createUrlWithSignzy(
    @Param("brandId") brandId: string,
    @Body() dto: CreateDigiLockerUrlDto
  ) {
    // Set brandId from URL param if not provided in body
    if (!dto.brandId) {
      dto.brandId = brandId;
    }

    return await this.digiLocker20Service.createDigiLockerUrlWithSignzy(dto);
  }

  /**
   * Generate KYC Unified URL using Digitap
   * POST /partner/brand/:brandId/digilocker/digitap/generate-url
   */
  @AuthType("partner")
  @Post("digitap/generate-url")
  @HttpCode(HttpStatus.OK)
  async generateUrlWithDigitap(
    @Param("brandId") brandId: string,
    @Body() dto: CreateDigiLockerUrlDto
  ) {
    // Set brandId from URL param if not provided in body
    if (!dto.brandId) {
      dto.brandId = brandId;
    }

    return await this.digiLocker20Service.generateKycUnifiedUrlWithDigitap(dto);
  }

  /**
   * Generate URL with Fallback (Digitap -> Signzy or vice versa)
   * POST /partner/brand/:brandId/digilocker/with-fallback
   */
  @AuthType("partner")
  @Post("with-fallback")
  @HttpCode(HttpStatus.OK)
  async generateUrlWithFallback(
    @Param("brandId") brandId: string,
    @Body() dto: CreateDigiLockerUrlDto
  ) {
    // Set brandId from URL param if not provided in body
    if (!dto.brandId) {
      dto.brandId = brandId;
    }

    return await this.digiLocker20Service.generateUrlWithFallback(dto);
  }

  /**
   * Handle Signzy DigiLocker Callback
   * POST /partner/brand/:brandId/digilocker/signzy/callback
   */
  @Post("signzy/callback")
  @HttpCode(HttpStatus.OK)
  @AuthType("partner") // Allow callback without authentication
  async handleSignzyCallback(
    @Param("brandId") brandId: string,
    @Body() callbackData: SignzyCallbackDto
  ) {
    return await this.digiLocker20Service.handleSignzyCallback(
      brandId,
      callbackData
    );
  }
  /**
   * Get DigiLocker logs
   * GET /partner/brand/:brandId/digilocker/logs
   */
  @AuthType("partner")
  @Get("logs")
  async getLogs(
    @Param("brandId") brandId: string,
    @Query("provider") provider?: string,
    @Query("requestType") requestType?: string,
    @Query("status") status?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string
  ) {
    return this.digiLocker20Service.getDigiLockerLogs(
      brandId,
      provider,
      requestType,
      status,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20
    );
  }

  /**
   * Get DigiLocker request by ID
   * GET /partner/brand/:brandId/digilocker/:digiLockerId
   */
  @AuthType("partner")
  @Get(":digiLockerId")
  async getRequestById(
    @Param("brandId") brandId: string,
    @Param("digiLockerId") digiLockerId: string
  ) {
    return this.digiLocker20Service.getDigiLockerRequestById(
      brandId,
      digiLockerId
    );
  }

  /**
   * Manual Sync for Digitap
   * POST /partner/brand/:brandId/digilocker/digitap/manual-sync
   * Triggers manual Aadhaar verification success for testing/manual sync
   */
  @AuthType("public")
  @Post("digitap/manual-sync")
  @HttpCode(HttpStatus.OK)
  async handleDigitapManualSuccess(
    @Param("brandId") brandId: string,
    @Body() body: { userId: string }
  ) {
    return await this.digiLocker20Service.handleDigitapManualSync(
      body.userId,
      brandId
    );
  }

  /**
   * Manual Sync for Signzy
   * POST /partner/brand/:brandId/digilocker/signzy/manual-sync
   * Triggers manual Aadhaar verification success for testing/manual sync
   */
  @AuthType("public")
  @Post("signzy/manual-sync")
  @HttpCode(HttpStatus.OK)
  async handleSignzyManualSuccess(
    @Param("brandId") brandId: string,
    @Body() body: { userId: string }
  ) {
    return await this.digiLocker20Service.handleSignzyManualSync(
      body.userId,
      brandId
    );
  }
}

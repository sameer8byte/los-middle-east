import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  Get, 
  Query,
  Param 
} from "@nestjs/common";
import { MobileToAddressVerificationService } from "./mobile-to-address-verification.service";
import { 
  VerifyMobileDto, 
  VerifyMobileWithServiceDto,
  VerifyMobileBatchDto
} from "./dto/verify-mobile.dto";
import { AuthType } from "src/common/decorators/auth.decorator";

@AuthType('partner')
@Controller('partner/mobile-to-addrress-verification')  // Removed :brandId from route
export class MobileToAddressVerificationController {
  constructor(
    private readonly mobileVerificationService: MobileToAddressVerificationService
  ) {}

  @Post('mobile-to-addresses')
  @HttpCode(HttpStatus.OK)
  async mobileToAddresses(
    @Body() dto: VerifyMobileDto  // brandId comes from body only
  ) {
    return await this.mobileVerificationService.verifyMobileToAddressesWithKycKart(
      dto.userId,
      dto.brandId,      // brandId from request body
      dto.checkId,
      dto.groupId
    );
  }

  @Post('mobile-to-addresses-ecom')
  @HttpCode(HttpStatus.OK)
  async mobileToAddressesEcom(
    @Body() dto: VerifyMobileDto  // brandId comes from body only
  ) {
    return await this.mobileVerificationService.verifyMobileToAddressesEcomWithKycKart(
      dto.userId,
      dto.brandId,      // brandId from request body
      dto.checkId,
      dto.groupId
    );
  }

  @Post('mobile-to-lpg-details')
  @HttpCode(HttpStatus.OK)
  async mobileToLpgDetails(
    @Body() dto: VerifyMobileDto  // brandId comes from body only
  ) {
    return await this.mobileVerificationService.verifyMobileToLpgDetailsWithKycKart(
      dto.userId,
      dto.brandId,      // brandId from request body
      dto.checkId,
      dto.groupId
    );
  }

  @Post('mobile-to-dl-advanced')
  @HttpCode(HttpStatus.OK)
  async mobileToDLAdvanced(
    @Body() dto: VerifyMobileDto  // brandId comes from body only
  ) {
    return await this.mobileVerificationService.verifyMobileToDLAdvancedWithKycKart(
      dto.userId,
      dto.brandId,      // brandId from request body
      dto.checkId
    );
  }

  @Post('with-service')
  @HttpCode(HttpStatus.OK)
  async verifyWithService(
    @Body() dto: VerifyMobileWithServiceDto  // brandId comes from body only
  ) {
    return await this.mobileVerificationService.verifyMobileWithService(
      dto.serviceType,
      dto.userId,
      dto.brandId,      // brandId from request body
      dto.checkId,
      dto.groupId
    );
  }

  @Post('batch-verify')
  @HttpCode(HttpStatus.OK)
  async batchVerify(
    @Body() dto: VerifyMobileBatchDto  // brandId comes from body only
  ) {
    return await this.mobileVerificationService.verifyMobileBatchWithKycKart(
      dto.userId,
      dto.brandId,      // brandId from request body
      dto.checkId,
      dto.groupId
    );
  }

  @Get('logs')
  async getMobileVerificationLogs(
    @Query('brandId') brandId: string,  // brandId as query param for logs
    @Query('serviceType') serviceType?: string,
    @Query('provider') provider?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.mobileVerificationService.getMobileVerificationLogs(
      brandId,
      serviceType,
      provider,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
    );
  }

  @Get('logs/all/:brandId')
  async getAllMobileVerificationLogs(
    @Param('brandId') brandId: string
  ) {
    return await this.mobileVerificationService.getAllMobileVerificationLogs(brandId);
  }
}
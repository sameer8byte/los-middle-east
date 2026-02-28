// src/mobile-verification/mobile-verification.controller.ts
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { MobileVerificationService } from './mobile-verification.service';
import { MobileCheckDto } from '../dto/mobile-check.dto';
import { AuthType } from "src/common/decorators/auth.decorator";

@AuthType("partner")
@Controller('kycKart/mobileVerification')
@UsePipes(new ValidationPipe({ transform: true }))
export class MobileVerificationController {
  constructor(private readonly mobileVerificationService: MobileVerificationService) {}

  @Post('mobileAge')
  async checkMobileAge(@Body() body: MobileCheckDto) {
    const { mobileNo, userId, brandId, checkId, groupId } = body;
    return this.mobileVerificationService.checkMobileAge(
      mobileNo,
      userId,
      brandId,
      checkId,
      groupId,
    );
  }
}

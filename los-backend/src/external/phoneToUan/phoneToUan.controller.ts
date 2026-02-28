import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { PhoneToUanService } from './phoneToUan.service';
import { PhoneToUanDto } from './dto/phone-to-uan.dto';
import { AuthType } from 'src/common/decorators/auth.decorator';

@AuthType('partner')
@Controller('partner/brand/:brandId/phone-to-uan')
export class PhoneToUanController {
  constructor(private readonly phoneToUanService: PhoneToUanService) {}

  /**
   * Get UAN by phone number using configured provider
   * POST /partner/brand/:brandId/phone-to-uan/lookup
   */
  @Post('lookup')
  async getUanByPhone(
    @Param('brandId') brandId: string,
    @Body() phoneToUanDto: PhoneToUanDto,
  ) {
    return this.phoneToUanService.getUanByPhone(
      brandId,
      {
        mobileNumber: phoneToUanDto.mobileNumber,
        checkId: phoneToUanDto.checkId,
        groupId: phoneToUanDto.groupId,
      },
      phoneToUanDto.userId,
    );
  }

  /**
   * Get UAN by phone number with automatic fallback to secondary provider
   * POST /partner/brand/:brandId/phone-to-uan/lookup-with-fallback
   */
  @Post('lookup-with-fallback')
  async getUanByPhoneWithFallback(
    @Param('brandId') brandId: string,
    @Body() phoneToUanDto: PhoneToUanDto,
  ) {
    return this.phoneToUanService.getUanByPhoneWithFallback(
      brandId,
      {
        mobileNumber: phoneToUanDto.mobileNumber,
        checkId: phoneToUanDto.checkId,
        groupId: phoneToUanDto.groupId,
      },
      phoneToUanDto.userId,
    );
  }

  /**
   * Get phone to UAN logs for a brand
   * GET /partner/brand/:brandId/phone-to-uan/logs
   */
  @Get('logs')
  async getPhoneToUanLogs(
    @Param('brandId') brandId: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.phoneToUanService.getPhoneToUanLogs(
      brandId,
      status,
      provider,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
    );
  }
}

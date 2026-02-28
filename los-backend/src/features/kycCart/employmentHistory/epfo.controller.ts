// src/epfo/epfo.controller.ts
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { EpfoService } from './epfo.service';
import { EmploymentHistoryDto } from '../dto/epfo-history.dto';
import { AuthType } from "src/common/decorators/auth.decorator";
import { AlternatePhoneHistoryDto } from '../dto/epfo-alternate-number.dto'; // Import the new DTO


@AuthType("partner")
@Controller('epfo')
@UsePipes(new ValidationPipe({ transform: true }))
export class EpfoController {
  constructor(private readonly epfoService: EpfoService) {}

  @Post('employment-history')
  async getEmploymentHistory(@Body() body: EmploymentHistoryDto) {
    const { userId, brandId, checkId, groupId, cacheOnly } = body;
    return this.epfoService.getUanAndHistory(userId, brandId, checkId, groupId, { cacheOnly: !!cacheOnly });
  }

  @Post('employment-history-alternate')
  async getEmploymentHistoryAlternate(@Body() body: AlternatePhoneHistoryDto) {
    const { userId, brandId, mobileNumber, checkId, groupId, cacheOnly } = body;
    return this.epfoService.getUanAndHistoryWithAlternatePhone(
      userId,
      brandId,
      mobileNumber,
      checkId,
      groupId,
      { cacheOnly: !!cacheOnly }
    );
  }

  @Post('test-uan-lookup')
  async testUanLookup(@Body() body: EmploymentHistoryDto) {
    const { userId, brandId, checkId, groupId } = body;
    return this.epfoService.testUanLookupOnly(userId, brandId, checkId, groupId);
  }
}

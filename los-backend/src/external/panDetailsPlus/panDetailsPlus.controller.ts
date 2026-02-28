import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, Param } from "@nestjs/common";
import { PanDetailsPlusService } from "./panDetailsPlus.service";
import { VerifyPanDto, VerifyPanWithFallbackDto } from "./dto/verify-pan.dto";
import { AuthType } from "src/common/decorators/auth.decorator";

@AuthType('partner')
@Controller('partner/brand/:brandId/pan-details-plus')
export class PanDetailsPlusController {
  constructor(private readonly panDetailsPlusService: PanDetailsPlusService) {}

  @Post("digitap")
  @HttpCode(HttpStatus.OK)
  async verifyWithDigitap(
    @Param('brandId') brandId: string,
    @Body() dto: VerifyPanDto
  ) {
    return await this.panDetailsPlusService.verifyPanWithDigitap(
      dto.pan,
      dto.userId,
      brandId,
      dto.shouldUpsert ?? true
    );
  }

  @Post("scoreme")
  @HttpCode(HttpStatus.OK)
  async verifyWithScoreMe(
    @Param('brandId') brandId: string,
    @Body() dto: VerifyPanDto
  ) {
    return await this.panDetailsPlusService.verifyPanWithScoreMe(
      dto.pan,
      dto.userId,
      brandId,
      dto.shouldUpsert ?? true
    );
  }

  @Post("both")
  @HttpCode(HttpStatus.OK)
  async verifyWithBoth(
    @Param('brandId') brandId: string,
    @Body() dto: VerifyPanDto
  ) {
    return await this.panDetailsPlusService.verifyPanBoth(
      dto.pan,
      dto.userId,
      brandId,
      dto.shouldUpsert ?? true
    );
  }

  @Post("with-fallback")
  @HttpCode(HttpStatus.OK)
  async verifyWithFallback(
    @Param('brandId') brandId: string,
    @Body() dto: VerifyPanWithFallbackDto
  ) {
    return await this.panDetailsPlusService.verifyPanWithFallback(
      dto.pan,
      dto.userId,
      brandId,
      dto.shouldUpsert ?? true
    );
  }

  @Get('logs')
  async getPanDetailsLogs(
      @Param('brandId') brandId: string,
      @Query('status') status?: string,
      @Query('provider') provider?: string,
      @Query('skip') skip?: string,
      @Query('take') take?: string,
    ) {
      return this.panDetailsPlusService.getPanDetailsLogs(
        brandId,
        status,
        provider,
        skip ? parseInt(skip) : 0,
        take ? parseInt(take) : 20,
      );
    }
}




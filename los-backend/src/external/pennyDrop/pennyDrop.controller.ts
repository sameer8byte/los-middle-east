import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { PennyDropService } from './pennyDrop.service';
import { PennyDropDto } from './dto/penny-drop.dto';
import { AuthType } from 'src/common/decorators/auth.decorator';

@AuthType('partner')
@Controller('partner/brand/:brandId/penny-drop')
export class PennyDropController {
  constructor(private readonly pennyDropService: PennyDropService) {}

  /**
   * Verify bank account using configured provider
   * POST /partner/brand/:brandId/penny-drop/verify
   */
  @Post('verify')
  async verifyBankAccount(
    @Param('brandId') brandId: string,
    @Body() pennyDropDto: PennyDropDto,
  ) {
    return this.pennyDropService.verifyBankAccount(
      brandId,
      {
        accountNumber: pennyDropDto.accountNumber,
        ifsc: pennyDropDto.ifsc,
        beneficiaryName: pennyDropDto.beneficiaryName,
        // email: pennyDropDto.email,
      },
      pennyDropDto.userId,
      pennyDropDto.userBankAccountId,
    );
  }

  /**
   * Verify bank account with automatic fallback to secondary provider
   * POST /partner/brand/:brandId/penny-drop/verify-with-fallback
   */
  @Post('verify-with-fallback')
  async verifyBankAccountWithFallback(
    @Param('brandId') brandId: string,
    @Body() pennyDropDto: PennyDropDto,
  ) {
    return this.pennyDropService.verifyBankAccountWithFallback(
      brandId,
      {
        accountNumber: pennyDropDto.accountNumber,
        ifsc: pennyDropDto.ifsc,
        beneficiaryName: pennyDropDto.beneficiaryName,
        // email: pennyDropDto.email,
      },
      pennyDropDto.userId,
      pennyDropDto.userBankAccountId,
    );
  }

  /**
   * Get penny drop logs for a brand
   * GET /partner/brand/:brandId/penny-drop/logs
   */
  @Get('logs')
  async getPennyDropLogs(
    @Param('brandId') brandId: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.pennyDropService.getPennyDropLogs(
      brandId,
      status,
      provider,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
    );
  }
}

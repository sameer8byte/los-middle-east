import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { LoanwalleService } from './loanwalle.service';
import { CreateLeadRequestDto } from './dto/create-lead.dto';
import { AuthType } from 'src/common/decorators/auth.decorator';

@Controller('loanwalle')
export class LoanwalleController {
  constructor(private readonly loanwalleService: LoanwalleService) {}

  @AuthType(['partner', 'api-key'])
  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  async createLead(@Body() body: CreateLeadRequestDto) {
    return this.loanwalleService.createLead(body);
  }

  @AuthType(['partner', 'api-key'])
  @Get('leads/:leadId')
  @HttpCode(HttpStatus.OK)
  async getLeadStatus(@Param('leadId') leadId: string) {
    return this.loanwalleService.getLeadStatus(leadId);
  }

  @AuthType(['partner', 'api-key'])
  @Get('test')
  @HttpCode(HttpStatus.OK)
  async testApiKey() {
    return {
      success: true,
      message: 'API Key authentication is working correctly',
      timestamp: new Date().toISOString(),
      data: {
        apiName: 'Loanwalle Test Endpoint',
        description: 'This endpoint confirms that your API key is valid and authenticated',
        version: '1.0.0',
      },
    };
  }
}

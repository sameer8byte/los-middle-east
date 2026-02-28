import { Controller, Post, Body } from '@nestjs/common';
import { ReportsAggregatorService } from './report.service';
import { AuthType } from 'src/common/decorators/auth.decorator';

@AuthType('public')
@Controller('reports')
export class ReportsAggregatorController {
  constructor(private readonly reportsService: ReportsAggregatorService) {}

  @Post()
  async getUserReport(@Body('userId') userId: string) {
    return this.reportsService.getUserReport(userId);
  }
}
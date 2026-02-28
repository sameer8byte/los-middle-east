import { Controller, Post, Body, Param, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { UanToEmploymentService } from './uanToEmployment.service';
import { UanToEmploymentDto } from './dto/uan-to-employment.dto';
import { AuthType } from 'src/common/decorators/auth.decorator';
import { EmploymentHistoryDto } from 'src/features/kycCart/dto/epfo-history.dto';

@AuthType('partner')
@Controller('partner/brand/:brandId/uan-to-employment')
export class UanToEmploymentController {
  constructor(private readonly uanToEmploymentService: UanToEmploymentService) {}

  /**
   * Get employment history by UAN using configured provider
   * POST /partner/brand/:brandId/uan-to-employment/fetch
   */
  @Post('fetch')
  async getEmploymentHistoryByUan(
    @Param('brandId') brandId: string,
    @Body() uanToEmploymentDto: UanToEmploymentDto,
  ) {
    return this.uanToEmploymentService.getEmploymentHistoryByUan(
      brandId,
      {
        uan: uanToEmploymentDto.uan,
        pan: uanToEmploymentDto.pan,
        mobile: uanToEmploymentDto.mobile,
        dob: uanToEmploymentDto.dob,
        employeeName: uanToEmploymentDto.employeeName,
        groupId: uanToEmploymentDto.groupId,
        checkId: uanToEmploymentDto.checkId,
      },
      uanToEmploymentDto.userId,
    );
  }

@Post('employment-history')
async getEmploymentHistory(@Body() body: EmploymentHistoryDto) {
  const { userId, brandId, checkId, groupId, cacheOnly } = body;
  
  // Use the enhanced fallback method that handles everything
  return this.uanToEmploymentService.getCompleteEmploymentHistoryWithFallback(
    userId, 
    brandId, 
    checkId, 
    groupId, 
    { cacheOnly: !!cacheOnly }
  );
}

@Post('fetch-with-fallback')
async getEmploymentHistoryByUanWithFallback(
  @Param('brandId') brandId: string,
  @Body() uanToEmploymentDto: UanToEmploymentDto,
) {
  // For direct UAN-based calls, use the original fallback
  return this.uanToEmploymentService.getEmploymentHistoryByUanWithFallback(
    brandId,
    {
      uan: uanToEmploymentDto.uan,
      pan: uanToEmploymentDto.pan,
      mobile: uanToEmploymentDto.mobile,
      dob: uanToEmploymentDto.dob,
      employeeName: uanToEmploymentDto.employeeName,
      groupId: uanToEmploymentDto.groupId,
      checkId: uanToEmploymentDto.checkId,
    },
    uanToEmploymentDto.userId,
  );
}
@Post('digitap/pan')
async getEmploymentHistoryByPanWithDigitap(
  @Param('brandId') brandId: string,
  @Body() uanToEmploymentDto: UanToEmploymentDto,
) {
  if (!uanToEmploymentDto.userId) {
    throw new HttpException(
      'User ID is required to fetch PAN from database',
      HttpStatus.BAD_REQUEST
    );
  }
  
  return this.uanToEmploymentService.getEmploymentHistoryWithDigitapByPan(
    brandId, 
    uanToEmploymentDto.userId, 
    
  );
}

@Post('digitap/uan')
async getEmploymentHistoryByUanWithDigitap(
  @Param('brandId') brandId: string,
  @Body() uanToEmploymentDto: UanToEmploymentDto,
) {
  if (!uanToEmploymentDto.userId) {
    throw new HttpException(
      'User ID is required to fetch UAN from database',
      HttpStatus.BAD_REQUEST
    );
  }
  
  return this.uanToEmploymentService.getEmploymentHistoryWithDigitapByUan(
    brandId, 
    uanToEmploymentDto.userId, 
  );
}

  /**
   * Get UAN to employment logs for a brand
   * GET /partner/brand/:brandId/uan-to-employment/logs
   */
  @Get('logs')
  async getUanToEmploymentLogs(
    @Param('brandId') brandId: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.uanToEmploymentService.getUanToEmploymentLogs(
      brandId,
      status,
      provider,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
    );
  }

  @Post('comprehensive-fallback')
  async getEmploymentHistoryComprehensive(
    @Param('brandId') brandId: string,
    @Body() uanToEmploymentDto: UanToEmploymentDto,
  ) {
    return this.uanToEmploymentService.getEmploymentHistoryWithComprehensiveFallback(
      brandId,
      uanToEmploymentDto.userId,
    );
  }
}



//MINUTES0000034
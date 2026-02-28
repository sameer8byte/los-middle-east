import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeadFormsService } from './leadForms.service';
import { QueryLeadFormsDto } from './dto/leadForm.dto';
import { AuthType } from 'src/common/decorators/auth.decorator';

@Controller('partner/brand/:brandId/lead-forms')
@AuthType("partner")
export class LeadFormsController {
  constructor(private readonly leadFormsService: LeadFormsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(
    @Param('brandId') brandId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.leadFormsService.uploadCsvFile(brandId, file);
  }

  @Get()
  async getLeadForms(
    @Param('brandId') brandId: string,
    @Query(ValidationPipe) query: QueryLeadFormsDto,
  ) {
    return this.leadFormsService.getLeadForms(brandId, query);
  }

  @Post('sync')
  async syncToDatabase(
    @Param('brandId') brandId: string,
    @Body() body: { leadFormIds?: string[] },
  ) {
    return this.leadFormsService.syncToDatabase(brandId, body?.leadFormIds);
  }

  @Get('stats')
  async getStats(@Param('brandId') brandId: string) {
    return this.leadFormsService.getStats(brandId);
  }

  @Get(':id')
  async getLeadFormById(
    @Param('brandId') brandId: string,
    @Param('id') id: string,
  ) {
    return this.leadFormsService.getLeadFormById(brandId, id);
  }

  @Delete('bulk')
  async deleteBulkLeadForms(
    @Param('brandId') brandId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.leadFormsService.deleteBulkLeadForms(brandId, body.ids);
  }
}

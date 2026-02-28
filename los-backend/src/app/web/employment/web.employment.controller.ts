// src/employment/web-employment.controller.ts

import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";

import { WebEmploymentService } from "./web.employment.service";
import { AuthType } from "src/common/decorators/auth.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreatePayslipWithFileDto } from "./dto/create-payslip-with-file.dto";
import { Payslip } from "@prisma/client";
import { UpdateEmploymentDto } from "src/shared/employment/dto/update-employment.dto";

@AuthType("web")
@Controller("web/employment")
export class WebEmploymentController {
  constructor(private readonly webEmploymentService: WebEmploymentService) {}

  @Get(":employmentId")
  async getEmployment(@Param("employmentId") employmentId: string) {
    return this.webEmploymentService.getEmployment(employmentId);
  }

  @Patch(":employmentId")
  async updateEmployment(
    @Param("employmentId") employmentId: string,
    @Body() updateEmploymentDto: UpdateEmploymentDto,
  ) {
    return this.webEmploymentService.updateEmployment(
      employmentId,
      updateEmploymentDto,
    );
  }

  @Get(":employmentId/payslips")
  async getPayslip(@Param("employmentId") payslipId: string) {
    return this.webEmploymentService.getPayslips(payslipId);
  }

  @Post("payslips")
  @UseInterceptors(FileInterceptor("file")) // 'file' is the name of the form field
  async createPayslip(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreatePayslipWithFileDto,
  ): Promise<Payslip> {
    return this.webEmploymentService.createPayslip({ ...data, file });
  }

  @Delete("payslips/:payslipId")
  async deletePayslip(@Param("payslipId") payslipId: string) {
    return this.webEmploymentService.deletePayslip(payslipId);
  }
}

// src/employment/employment.service.ts

import { BadRequestException, Injectable } from "@nestjs/common";
import { Employment, Payslip } from "@prisma/client";
import { CreatePayslipWithFileDto } from "./dto/create-payslip-with-file.dto";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { EmploymentService } from "src/shared/employment/employment.service";
import { UpdateEmploymentDto } from "src/shared/employment/dto/update-employment.dto";
import { PayslipService } from "src/shared/payslip/payslip.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class WebEmploymentService {
  constructor(
    private readonly employmentService: EmploymentService,
    private readonly prisma: PrismaService,
    private readonly payslipService: PayslipService,
    private readonly awsS3Service: AwsPublicS3Service, // Assuming you have an S3 service for file uploads
  ) {}
  // get employment
  async getEmployment(employmentId: string): Promise<Employment | null> {
    return this.employmentService.findOne(employmentId, {
      payslips: true,
    });
  }

  // updater
  async updateEmployment(
    employmentId: string,
    data: UpdateEmploymentDto,
  ): Promise<Employment> {
    const employment = await this.employmentService.update(employmentId, data);
    return employment;
  }

  // get payslip
  async getPayslips(employmentId: string): Promise<Payslip[] | null> {
    return this.payslipService.findAll({
      employmentId: employmentId,
    });
  }

  // payslip create
  async createPayslip(data: CreatePayslipWithFileDto): Promise<Payslip> {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    // upload file to s3
    const file = await this.awsS3Service.uploadPrivateDocument(
      data.file as Express.Multer.File,
      user.brandId,
      data.userId,
      "payslip",
    );
    if (!file) {
      throw new BadRequestException("File upload failed");
    }
    const payslip = await this.payslipService.create({
      userId: data.userId,
      employmentId: data.employmentId,
      fileName: `payslip-${data.month}-${data.year}`,
      filePrivateKey: file.key,
      year: Number(data.year),
      month: Number(data.month),
      filePassword: data.filePassword,
    });
    return payslip;
  }

  // payslip delete
  async deletePayslip(payslipId: string): Promise<Payslip> {
    return this.payslipService.remove(payslipId);
  }
}

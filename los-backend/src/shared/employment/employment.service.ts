// src/employment/employment.service.ts

import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateEmploymentDto } from "./dto/create-employment.dto";
import {
  Employment,
  ModeOfSalary,
  Prisma,
  user_data_status,
} from "@prisma/client";
import { UpdateEmploymentDto } from "./dto/update-employment.dto";

@Injectable()
export class EmploymentService {
  constructor(private prisma: PrismaService) {}

  create(
    createEmploymentDto: CreateEmploymentDto,
    userId: string,
  ): Promise<Employment> {
    return this.prisma.employment.create({
      data: {
        userId,
        ...createEmploymentDto,
      },
    });
  }

  findAll(): Promise<Employment[]> {
    return this.prisma.employment.findMany();
  }

  findOne(
    id: string,
    include?: Prisma.EmploymentInclude,
  ): Promise<Employment | null> {
    return this.prisma.employment.findUnique({
      where: { id },
      include: include,
    });
  }

  update(
    id: string,
    updateEmploymentDto: UpdateEmploymentDto,
  ): Promise<Employment> {
    return this.prisma.employment.update({
      where: { id },
      data: updateEmploymentDto,
    });
  }

  remove(id: string): Promise<Employment> {
    return this.prisma.employment.delete({
      where: { id },
    });
  }

  // Service method to create or update a not verified employment record
  async createNotVerifiedUserEmployment(
    userId: string,
    brandId: string,
    data: {
      companyName: string | null;
      designation: string | null;
      officialEmail: string | null;
      joiningDate: Date | null;
      salary: number | null;
      companyAddress: string | null;
      pinCode: string | null;
      uanNumber: string | null;
      expectedDateOfSalary: number | null;
      modeOfSalary: ModeOfSalary | null;
    },
  ) {
    // Check if the user already has an employment record
    const existingEmployment = await this.prisma.employment.findFirst({
      where: {
        userId: userId,
      },
    });

    // If no existing employment record, create a new one
    if (!existingEmployment) {
      return this.create(
        {
          companyName: data.companyName,
          designation: data.designation,
          officialEmail: data.officialEmail,
          joiningDate: data.joiningDate,
          salary: data.salary,
          companyAddress: data.companyAddress,
          pinCode: data.pinCode,
          uanNumber: data.uanNumber,
          expectedDateOfSalary: data.expectedDateOfSalary,
          modeOfSalary: data.modeOfSalary,
        },
        userId,
      );
    }

    // If the employment is found and status is NOT_VERIFIED, update it
    if (existingEmployment.userDataStatus === user_data_status.NOT_VERIFIED) {
      return this.update(existingEmployment.id, {
        companyName: existingEmployment.companyName || data.companyName,
        designation: existingEmployment.designation || data.designation,
        officialEmail: existingEmployment.officialEmail || data.officialEmail,
        joiningDate: existingEmployment.joiningDate || data.joiningDate,
        salary: existingEmployment.salary || data.salary,
        companyAddress:
          existingEmployment.companyAddress || data.companyAddress,
        pinCode: existingEmployment.pinCode || data.pinCode,
        uanNumber: existingEmployment.uanNumber || data.uanNumber,
        expectedDateOfSalary:
          existingEmployment.expectedDateOfSalary || data.expectedDateOfSalary,
        modeOfSalary: existingEmployment.modeOfSalary || data.modeOfSalary,
      });
    }

    // Return the existing employment if it's verified or already exists with verified status
    return existingEmployment;
  }
  // Service method to find employment records by user ID
  async findByUserId(
    userId: string,
    include?: Prisma.EmploymentInclude,
  ): Promise<Employment | null> {
    return await this.prisma.employment.findUnique({
      where: { userId },
      include: include,
    });
  }
}

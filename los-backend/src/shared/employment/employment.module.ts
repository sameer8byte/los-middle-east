// src/employment/employment.module.ts

import { Module } from "@nestjs/common";
import { EmploymentService } from "./employment.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  providers: [EmploymentService, PrismaService],
  exports: [EmploymentService], // in case you want to use it in other modules
})
export class EmploymentModule {}

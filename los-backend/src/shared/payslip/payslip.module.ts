import { Module } from "@nestjs/common";
import { PayslipService } from "./payslip.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  providers: [PayslipService, PrismaService],
  exports: [PayslipService], // in case you want to use it in other modules
})
export class PayslipModule {}

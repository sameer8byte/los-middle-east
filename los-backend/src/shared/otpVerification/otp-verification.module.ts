import { Module } from "@nestjs/common";
import { OtpVerificationService } from "./otp-verification.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersModule } from "../user/user.module";

@Module({
  imports: [UsersModule],
  providers: [OtpVerificationService, PrismaService],
  exports: [OtpVerificationService],
})
export class OtpVerificationModule {}

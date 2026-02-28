import { Module } from "@nestjs/common";
import { AlternatePhoneNumberService } from "./alternate-phone-number.service";
import { AlternatePhoneNumberController } from "./alternate-phone-number.controller";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [AlternatePhoneNumberController],
  providers: [AlternatePhoneNumberService, PrismaService],
  exports: [AlternatePhoneNumberService], // Exporting the service for use in other modules
})
export class AlternatePhoneNumberModule {}

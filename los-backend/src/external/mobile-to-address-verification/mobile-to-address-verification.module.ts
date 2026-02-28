import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "src/prisma/prisma.module";
import { MobileToAddressVerificationService } from "./mobile-to-address-verification.service";
import { MobileToAddressVerificationController } from "./mobile-to-address-verification.controller";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: 30000, // 30 seconds timeout for mobile verification
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    ConfigModule,
  ],
  controllers: [MobileToAddressVerificationController],
  providers: [MobileToAddressVerificationService],
  exports: [MobileToAddressVerificationService],
})
export class MobileToAddressVerificationModule {}
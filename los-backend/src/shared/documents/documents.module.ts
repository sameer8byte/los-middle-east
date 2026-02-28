import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { DigitapModule } from "src/external/digitap/digitap.module";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    DigitapModule.register({
      baseUrl: process.env.DIGITAP_BASE_URL,
      authKey: process.env.DIGITAP_AUTH_KEY,
      // redirectUrl: process.env.DIGITAP_REDIRECT_URL,
      aadhaarOtpExpiry:
        parseInt(process.env.DIGITAP_AADHAAR_OTP_EXPIRY, 10) || 300, // default to 300 seconds if not
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

import { Module } from "@nestjs/common";
import { SignDeskModule } from "src/external/signdesk/signdesk.module";
import { SignzyV3ContractModule } from "src/external/signzy/signzy-v3-contract.module";
import { PrismaService } from "src/prisma/prisma.service";
import { EsignService } from "./esign.service";
import { EsignController } from "./esign.controller";
import { PdfModule } from "src/core/pdf/pdf.module";
import { NotificationModule } from "src/features/notification/notification.module";
import { DigitapEsignModule } from "src/external/digitapEsign/digitap.esign.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { DigiLocker20Module } from "src/external/digiLocker2.0";

@Module({
  imports: [
    SignDeskModule.register({
      apiKey: process.env.SIGNDESK_API_KEY,
      baseUrl: process.env.SIGNDESK_BASE_URL,
      apiId: process.env.SIGNDESK_API_ID,
    }),
    SignzyV3ContractModule.register({
      apiKey: process.env.SIGNZY_V3_API_KEY,
      baseUrl: process.env.SIGNZY_V3_BASE_URL,
    }),
    DigiLocker20Module.register({
      signzy: {
        baseUrl: process.env.SIGNZY_DIGILOCKER_BASE_URL || "",
        accessToken: process.env.SIGNZY_DIGILOCKER_ACCESS_TOKEN || "",
      },
      digitap: {
        baseUrl: process.env.DIGITAP_DIGILOCKER_BASE_URL || "",
        authKey: process.env.DIGITAP_DIGILOCKER_AUTH_KEY || "",
      },
    }),
    DigitapEsignModule, 
    PdfModule,
    NotificationModule,
  ],
  controllers: [EsignController],
  providers: [EsignService, PrismaService, AwsPublicS3Service],
  exports: [EsignService],
})
export class EsignModule {}
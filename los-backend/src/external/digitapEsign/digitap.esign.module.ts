// src/external/digitapEsign/digitap.module.ts
import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DigitapEsignService } from "./digitap.esign.service";
import { DigitapEsignConfig } from "./interface/digitap.esign.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { PdfService } from "src/core/pdf/pdf.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { CommunicationModule } from "src/core/communication/communication.module";

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    CommunicationModule,
  ],
  providers: [
    {
      provide: "DIGITAP_CONFIG",
      useFactory: (configService: ConfigService): DigitapEsignConfig => ({
        authKey: configService.get<string>("DIGITAP_CONTRACT_API_AUTH_KEY"), // Use the pre-encoded key
        baseUrl: configService.get<string>("DIGITAP_CONTRACT_API_BASE_URL"),
      }),
      inject: [ConfigService],
    },
    DigitapEsignService,
    PrismaService,
    PdfService,
    AwsPublicS3Service,
  ],
  exports: [DigitapEsignService],
})
export class DigitapEsignModule {}
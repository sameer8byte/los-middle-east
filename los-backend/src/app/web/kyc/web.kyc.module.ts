import { Module } from "@nestjs/common";
import { KycController } from "./web.kyc.controller";
import { KycService } from "./web.kyc.service";
import { DigitapModule } from "src/external/digitap/digitap.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { ScoreMeModule } from "src/external/scoreme/scoreme.module";
import { DocumentsModule } from "src/shared/documents/documents.module";
import { PanAadhaarModule } from "src/shared/pan-aadhaar/pan-aadhaar.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { PanDetailsPlusModule } from "src/external/panDetailsPlus/panDetailsPlus.modules";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { DigiLocker20Module } from "src/external/digiLocker2.0";

@Module({
  imports: [
    UserLogsModule,
    DigitapModule.register({
      baseUrl: process.env.DIGITAP_BASE_URL,
      authKey: process.env.DIGITAP_AUTH_KEY,
      // redirectUrl: process.env.DIGITAP_REDIRECT_URL,
      aadhaarOtpExpiry:
        parseInt(process.env.DIGITAP_AADHAAR_OTP_EXPIRY, 10) || 300, // default to 300 seconds if not
    }),
    ScoreMeModule.register({
      baseUrl: process.env.SCOREME_BASE_URL,
      clientId: process.env.SCOREME_CLIENT_ID,
      clientSecret: process.env.SCOREME_CLIENT_SECRET,
    }),
    PanDetailsPlusModule.register({
      digitap: {
        baseUrl: process.env.DIGITAP_BASE_URL,
        authKey: process.env.DIGITAP_AUTH_KEY,
      },
      scoreMe: {
        baseUrl: process.env.SCOREME_BASE_URL,
        clientId: process.env.SCOREME_CLIENT_ID,
        clientSecret: process.env.SCOREME_CLIENT_SECRET,
      },
    }),
    DocumentsModule,
    PanAadhaarModule,
    CommunicationModule,
     DigiLocker20Module.register({
      signzy: {
        baseUrl: process.env.SIGNZY_DIGILOCKER_BASE_URL,
        accessToken: process.env.SIGNZY_DIGILOCKER_ACCESS_TOKEN,
      },
      digitap: {
        baseUrl: process.env.DIGITAP_DIGILOCKER_BASE_URL,
        authKey: process.env.DIGITAP_DIGILOCKER_AUTH_KEY,
      },
    }),
    // Add any other modules that KycService depends on here
  ],
  controllers: [KycController],
  providers: [KycService, AwsPublicS3Service],
  exports: [KycService],
})
export class WebKycModule {}

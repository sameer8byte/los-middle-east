import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./src/prisma/prisma.module";
import { AuthGuard } from "./src/common/guards/auth.guard";
import { JwtModule } from "src/core/jwt/jwt.module";
import { DigitapModule } from "src/external/digitap/digitap.module";
import { BcryptModule } from "src/core/bcrypt/bcrypt.module";
import { WebModule } from "src/app/web/web.module";
import { PartnerModule } from "src/app/partner/partner.modules";
import { UploadModule } from "src/features/upload/upload.module";
import { LoansModule } from "src/features/loans/loans.modules";
import { EquifaxModule } from "src/external/equifax/equifax.module";
import { BasReportModule } from "src/features/bsaReport/bsaReport.module";
import { CommonAppModule } from "src/app/common/common.modules";
import { EvaluationModule } from "src/features/evaluation/evaluation.module";
import { EvaluationV2Module } from "src/features/evaluationV2/evaluation.module.v2";
import { GeoCodingModule } from "src/external/geocoding/geocoding.module";
import { BreModule } from "src/features/bre/bre.module";
import { EsignModule } from "src/features/esign/esign.module";
import { StringeeModule } from "src/external/stringee/stringee.module";
import { CallRequestModule } from "src/features/callRequest/callRequest.modules";
import { WebhookModule } from "src/core/webhooks/webhook.modules";
import { PaymentModule } from "src/features/payment/payment.module";
import { ScoreMeBdaModule } from "src/features/scoreMeBda/scoreMeBda.module";
import { CirProV2Module } from "src/external/cirProV2/cirProV2.module";
import { RedisModule } from "src/core/redis/redis.module";
import { AlternateAddressModule } from "src/shared/alternate-address/alternate-address.module";
import { AlternatePhoneNumberModule } from "src/shared/alternate-phone-number/alternate-phone-number.module";
import { AuthModule } from "src/features/auth/auth.module";
import { BrandsModule } from "src/shared/brands/brands.module";
import { UserDeviceModule } from "src/shared/devices/device.module";
import { DocumentsModule } from "src/shared/documents/documents.module";
import { LoginTokenModule } from "src/shared/loginToken/login-token.module";
import { OtpVerificationModule } from "src/shared/otpVerification/otp-verification.module";
import { PanAadhaarModule } from "src/shared/pan-aadhaar/pan-aadhaar.module";
import { UsersModule } from "src/shared/user/user.module";
import { FeaturesModule } from "src/features/features.modules";
import { HealthModule } from "src/common/health/health.module";
import { AAModule } from "src/external/aa/aa.module";
import { SignzyV3ContractModule } from "src/external/signzy/signzy-v3-contract.module";
import { MobileVerificationModule } from "src/features/kycCart/mobileVerification/mobile-verification.module";
import { EpfoModule } from "src/features/kycCart/employmentHistory/epfo.module";
import { PennyDropModule } from "src/external/pennyDrop/pennyDrop.modules";
import { PanDetailsPlusModule } from "src/external/panDetailsPlus/panDetailsPlus.modules";
import { PhoneToUanModule } from "src/external/phoneToUan/phoneToUan.module";
import { UanToEmploymentModule } from "src/external/uanToEmployment/uanToEmployment.modules";
import { CronModule } from "src/features/cron/cron.module";
import {MobileToAddressVerificationModule} from "./src/external/mobile-to-address-verification/mobile-to-address-verification.module";
import { DigiLocker20Module } from "src/external/digiLocker2.0/digiLocker2.0.modules";
import { TaskModule } from "src/external/task-api/task.module"
import { AwsModule } from "src/core/aws/aws.module";
import { WorkersModule } from "src/core/workers/workers.module";
import { QueueModule } from "src/core/queue/queue.module";
import { AcefoneModule } from "src/features/acefone.dailer/acefone.dailer.module";
import { FlowsModule } from "src/external/flows/flows.module";
import { LoanwalleModule } from "src/external/loanwalle/loanwalle.modules";
import { ApiKeyModule } from "src/features/api-key/api-key.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || "development"}`,
    }),
    DigitapModule.register({
      baseUrl: process.env.DIGITAP_BASE_URL,
      authKey: process.env.DIGITAP_AUTH_KEY,
      aadhaarOtpExpiry:
        parseInt(process.env.DIGITAP_AADHAAR_OTP_EXPIRY, 10) || 300, // default to 300 seconds if not
    }),
    BcryptModule.register({
      saltRounds: 12, // Can be loaded from env
    }),
    GeoCodingModule.register({
      baseUrl: "https://maps.googleapis.com/maps/api",
      apiKey: process.env.GOOGLE_GEOLOCATION_API_KEY,
    }),
    StringeeModule.register({
      apiKeySecret: process.env.STRINGEE_API_KEY_SECRET,
      apiKeySid: process.env.STRINGEE_KEY_SID,
      projectId: process.env.STRINGEE_PROJECT_ID,
      phoneNumber: process.env.STRINGEE_PHONE_NUMBER, // Optional, if you want to use a specific phone number
    }),

    CirProV2Module.register({
      baseUrl: process.env.CIR_PRO_V2_BASE_URL,
      userId: process.env.CIR_PRO_V2_USER_ID,
      password: process.env.CIR_PRO_V2_PASSWORD,
      customerId: process.env.CIR_PRO_V2_CUSTOMER_ID,
      contentType: process.env.CIR_PRO_V2_CONTENT_TYPE || "APPLICATION/JSON",
      customerName:
        process.env.CIR_PRO_V2_CUSTOMER_NAME ||
        "",
    }),
    RedisModule.register({
      enabled: process.env.REDIS_ENABLED === 'true', 
      url: process.env.REDIS_URL || "",
      ttl: Number.parseInt(process.env.REDIS_TTL, 10) || 300, 
    }),

    PrismaModule,
    CallRequestModule,
    EquifaxModule,
    JwtModule,
    BasReportModule,
    AuthModule,
    UploadModule,
    UserDeviceModule,
    UsersModule,
    AlternateAddressModule,
    AlternatePhoneNumberModule,
    PanAadhaarModule,
    LoginTokenModule,
    OtpVerificationModule,
    BreModule,
    BrandsModule,
    WebModule,
    WebhookModule,
    EvaluationModule,
    EvaluationV2Module,
    PartnerModule,
    PaymentModule, 
    CommonAppModule,
    FeaturesModule,
    LoansModule,
    EsignModule,
    DocumentsModule,
    ScoreMeBdaModule,
    AAModule,
    SignzyV3ContractModule.register({
      apiKey: process.env.SIGNZY_V3_API_KEY,
      baseUrl: process.env.SIGNZY_V3_BASE_URL,
    }),
    HealthModule,
    MobileVerificationModule,
    EpfoModule,
    PennyDropModule,
    PhoneToUanModule,
    UanToEmploymentModule,
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
    DigiLocker20Module.register({
      signzy: {
        baseUrl: process.env.SIGNZY_DIGILOCKER_BASE_URL || "",
        accessToken:process.env.SIGNZY_DIGILOCKER_ACCESS_TOKEN || "",
      },
      digitap: {
        baseUrl: process.env.DIGITAP_DIGILOCKER_BASE_URL || "",
        authKey: process.env.DIGITAP_DIGILOCKER_AUTH_KEY || "",
      },
    }),
    CronModule,
    MobileToAddressVerificationModule,
    TaskModule,
    EventEmitterModule.forRoot(),
    AwsModule,
    QueueModule,
    WorkersModule,
    AcefoneModule,
    LoanwalleModule,
    ApiKeyModule,
    // Only load FlowsModule if PRIVATE_KEY_PATH is configured
    ...(process.env.PRIVATE_KEY_PATH ? [FlowsModule] : []),

  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}

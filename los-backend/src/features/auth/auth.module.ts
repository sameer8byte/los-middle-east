import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { HttpModule } from "@nestjs/axios";
import { UsersModule } from "../../shared/user/user.module";
import { AuthController } from "./controller/web.auth.controller";
import { AuthService } from "./services/web.auth.service";
import { UserDetailsModule } from "../../shared/user-details/user-details.module";
import { DocumentsModule } from "../../shared/documents/documents.module";
import { PartnerAuthController } from "./controller/partner.auth.controller";
import { PartnerAuthService } from "./services/partner.auth.service";
import { LoginTokenModule } from "../../shared/loginToken/login-token.module";
import { OtpVerificationModule } from "../../shared/otpVerification/otp-verification.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { UserLogsModule } from "../user-logs/user-logs.module";
import { WebKycModule } from "src/app/web/kyc/web.kyc.module";
import { AwsModule } from "src/core/aws/aws.module";
import { BrandLoanValidationModule } from "../brandRuleValidation/brand.validation.module";

@Module({
  imports: [
    UserLogsModule,
    PrismaModule,
    HttpModule,
    UsersModule,
    OtpVerificationModule,
    AwsModule,
    LoginTokenModule,
    CommunicationModule,
    UserDetailsModule,
    DocumentsModule,
    WebKycModule,
    BrandLoanValidationModule,
  ],
  controllers: [AuthController, PartnerAuthController],
  providers: [AuthService, PartnerAuthService],
  exports: [AuthService],
})
export class AuthModule {}

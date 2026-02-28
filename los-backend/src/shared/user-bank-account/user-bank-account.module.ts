import { Module } from "@nestjs/common";
import { UserBankAccountService } from "./user-bank-account.service";
import { PrismaService } from "src/prisma/prisma.service";
import { DigitapModule } from "src/external/digitap/digitap.module";

@Module({
  imports: [
    DigitapModule.register({
      baseUrl: process.env.DIGITAP_BASE_URL,
      authKey: process.env.DIGITAP_AUTH_KEY,
      // redirectUrl: process.env.DIGITAP_REDIRECT_URL,
      aadhaarOtpExpiry:
        parseInt(process.env.DIGITAP_AADHAAR_OTP_EXPIRY, 10) || 300, // default to 300 seconds if not
    }),
  ],
  providers: [UserBankAccountService, PrismaService],
  exports: [UserBankAccountService], // in case you want to use it in other modules
})
export class UserBankAccountModule {}

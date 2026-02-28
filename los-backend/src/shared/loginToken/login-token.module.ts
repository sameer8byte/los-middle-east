import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service"; // make sure this exists
import { LoginTokenService } from "./login-token.service";

@Module({
  providers: [LoginTokenService, PrismaService],
  exports: [LoginTokenService],
})
export class LoginTokenModule {}

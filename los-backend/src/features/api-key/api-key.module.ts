import { Module } from "@nestjs/common";
import { ApiKeyService } from "./api-key.service";
import { ApiKeyController } from "./api-key.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { LoginTokenModule } from "src/shared/loginToken/login-token.module";

@Module({
  imports: [PrismaModule, LoginTokenModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}

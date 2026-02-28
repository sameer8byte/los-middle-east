import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { CallRequestService } from "./callRequest.service";
import { CallRequestController } from "./callRequest.controller";
import { StringeeModule } from "src/external/stringee/stringee.module";

@Module({
  imports: [
    PrismaModule,
    StringeeModule.register({
      apiKeySecret: process.env.STRINGEE_API_KEY_SECRET,
      apiKeySid: process.env.STRINGEE_KEY_SID,
      projectId: process.env.STRINGEE_PROJECT_ID,
      phoneNumber: process.env.STRINGEE_PHONE_NUMBER,
    }),
  ],
  controllers: [CallRequestController],
  providers: [CallRequestService],
  exports: [CallRequestService],
})
export class CallRequestModule {}

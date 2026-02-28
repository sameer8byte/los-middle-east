import { Module } from "@nestjs/common";
import { ServiceRequestLogService } from "./service-request-log.service";
import { ServiceRequestLogController } from "./service-request-log.controller";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [ServiceRequestLogController],
  providers: [ServiceRequestLogService, PrismaService],
  exports: [ServiceRequestLogService],
})
export class ServiceRequestLogModule {}

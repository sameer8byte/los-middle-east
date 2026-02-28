import { Module } from "@nestjs/common";
import { UsersController } from "./user.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { UsersService } from "./user.service";
import { GeoCodingModule } from "src/external/geocoding/geocoding.module";
import { NotificationModule } from "src/features/notification/notification.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { AutoAllocationModule } from "src/features/autoAllocation/autoAllocation.module";
import { AwsModule } from "src/core/aws/aws.module";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
import { BrandLoanValidationModule } from "src/features/brandRuleValidation/brand.validation.module";

@Module({
  imports: [
    UserLogsModule,
    AutoAllocationModule,
    AwsModule,
    BrandLoanValidationModule,
    GeoCodingModule.register({
      baseUrl: "https://maps.googleapis.com/maps/api",
      apiKey: process.env.GOOGLE_GEOLOCATION_API_KEY,
    }),
    PrismaModule,
    NotificationModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AwsAuditLogsSqsService],
  exports: [UsersService],
})
export class UsersModule {}

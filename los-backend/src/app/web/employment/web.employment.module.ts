import { Module } from "@nestjs/common";
import { WebEmploymentController } from "./web.employment.controller";
import { WebEmploymentService } from "./web.employment.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PayslipModule } from "src/shared/payslip/payslip.module";
import { EmploymentModule } from "src/shared/employment/employment.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";

@Module({
  imports: [UserLogsModule, EmploymentModule, PayslipModule],
  controllers: [WebEmploymentController],
  providers: [WebEmploymentService, AwsPublicS3Service],
  exports: [WebEmploymentService], // in case you want to use it in other modules
})
export class WebEmploymentModule {}

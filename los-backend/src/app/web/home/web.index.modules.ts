import { Module } from "@nestjs/common";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { WebIndexController } from "./web.index.controller";
import { WebIndexService } from "./web.index.service";
import { PdfModule } from "src/core/pdf/pdf.module";
import { UsersModule } from "src/shared/user/user.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";

@Module({
  imports: [UserLogsModule, UsersModule, PdfModule],
  controllers: [WebIndexController],
  providers: [WebIndexService, AwsPublicS3Service],
  exports: [WebIndexService],
})
export class WebIndexModule {}

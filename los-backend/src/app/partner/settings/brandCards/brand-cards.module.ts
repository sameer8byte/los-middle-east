import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { BrandCardsController } from "./brand-cards.controller";
import { BrandCardsService } from "./brand-cards.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandCardsController],
  providers: [BrandCardsService, AwsPublicS3Service, BrandSettingAuditLogService],
  exports: [BrandCardsService, BrandSettingAuditLogService],
})
export class BrandCardsModule {}

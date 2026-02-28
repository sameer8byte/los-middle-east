import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { BrandController } from "./brand.setting.controller";
import { BrandService } from "./brand.setting.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";
import { BrandAcefoneConfigController } from "./brand-acefone-config.controller";
import { BrandAcefoneConfigService } from "./brand-acefone-config.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandController, BrandAcefoneConfigController],
  providers: [BrandService, AwsPublicS3Service, BrandSettingAuditLogService, BrandAcefoneConfigService],
  exports: [BrandService, BrandSettingAuditLogService, BrandAcefoneConfigService],
})
export class BrandModule {}

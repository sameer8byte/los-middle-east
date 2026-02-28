import { Module } from "@nestjs/common";
import { BrandBlogsController } from "./brandBlogs.setting.controller";
import { BrandBlogsService } from "./brandBlogs.setting.service";
import { PrismaService } from "src/prisma/prisma.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandBlogsController],
  providers: [BrandBlogsService, PrismaService, BrandSettingAuditLogService],
  exports: [BrandBlogsService, BrandSettingAuditLogService],
})
export class BrandBlogsModule {}


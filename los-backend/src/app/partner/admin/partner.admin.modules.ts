import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ParterAdminService } from "./partner.admin.services";
import { PartnerAdminController } from "./partner.admin.controller";
import { BrandsModule } from "src/shared/brands/brands.module";

@Module({
  imports: [PrismaModule, BrandsModule],
  controllers: [PartnerAdminController],
  providers: [ParterAdminService],
  exports: [ParterAdminService],
})
export class PartnerAdminModule {}

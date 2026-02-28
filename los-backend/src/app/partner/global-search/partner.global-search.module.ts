import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { PartnerGlobalSearchController } from "./partner.global-search.controller";
import { PartnerGlobalSearchService } from "./partner.global-search.service";

@Module({
  imports: [PrismaModule],
  controllers: [PartnerGlobalSearchController],
  providers: [PartnerGlobalSearchService],
  exports: [PartnerGlobalSearchService],
})
export class PartnerGlobalSearchModule {}

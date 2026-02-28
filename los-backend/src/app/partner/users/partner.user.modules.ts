import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { PartnerUserController } from "./partner.user.controller";
import { ParterUserService } from "./partner.user.service";
import { PartnerUserSecureCodeService } from "./partner-user-secure-code.service";
import { PartnerUserDialerConfigService } from "./partner-user-dialer-config.service";
import { PartnerUserDialerConfigController } from "./partner-user-dialer-config.controller";

@Module({
  imports: [PrismaModule, CommunicationModule],
  controllers: [PartnerUserController, PartnerUserDialerConfigController],
  providers: [
    ParterUserService,
    PartnerUserSecureCodeService,
    PartnerUserDialerConfigService,
  ],
  exports: [
    ParterUserService,
    PartnerUserSecureCodeService,
    PartnerUserDialerConfigService,
  ],
})
export class PartnerUserModule {}

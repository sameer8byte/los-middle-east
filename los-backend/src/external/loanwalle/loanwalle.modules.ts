import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { LoanwalleService } from "./loanwalle.service";
import { LoanwalleController } from "./loanwalle.controller";
import { UsersModule } from "src/shared/user/user.module";
import { UtmService } from "src/app/common/services/utm.services";
import { NotificationModule } from "src/features/notification/notification.module";
import { AutoAllocationModule } from "src/features/autoAllocation/autoAllocation.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    UsersModule,
    NotificationModule,
    AutoAllocationModule,
  ],
  providers: [LoanwalleService, UtmService],
  controllers: [LoanwalleController],
  exports: [LoanwalleService],
})
export class LoanwalleModule {}


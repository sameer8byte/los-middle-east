import { Module } from "@nestjs/common";
import { CompletedLoansController } from "./completed.controller";
import { CompletedLoansService } from "./completed.service";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [CompletedLoansController],
  providers: [CompletedLoansService],
  exports: [CompletedLoansService],
})
export class CompletedLoansModule {}

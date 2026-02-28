import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BankAccountStatementService } from "./bank-account-statement.service";

@Module({
  providers: [BankAccountStatementService, PrismaService],
  exports: [BankAccountStatementService],
})
export class BankAccountStatementModule {}

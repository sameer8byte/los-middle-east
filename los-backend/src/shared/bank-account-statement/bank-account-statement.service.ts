import { Injectable } from "@nestjs/common";

import { PrismaService } from "src/prisma/prisma.service";
import { CreateBankAccountStatementDto } from "./dto/create-account-bank-statement.dto";
import { UpdateBankAccountStatementDto } from "./dto/update-account-bank-statement.dto";
import { Prisma } from "@prisma/client";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;

@Injectable()
export class BankAccountStatementService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBankAccountStatementDto) {
    return this.prisma.bankAccountStatement.create({
      data: {
        ...dto,
        fromDate: dto.fromDate ? _dayjs(dto.fromDate).toISOString() : null,
        toDate: dto.toDate ? _dayjs(dto.toDate).toISOString() : null,
      },
    });
  }
  findAll(where?: Prisma.BankAccountStatementWhereInput) {
    return this.prisma.bankAccountStatement.findMany({
      where,
    });
  }
  findOne(id: string) {
    return this.prisma.bankAccountStatement.findUnique({
      where: { id },
    });
  }
  update(id: string, dto: UpdateBankAccountStatementDto) {
    return this.prisma.bankAccountStatement.update({
      where: { id },
      data: dto,
    });
  }
  remove(id: string) {
    return this.prisma.bankAccountStatement.delete({
      where: { id },
    });
  }
}

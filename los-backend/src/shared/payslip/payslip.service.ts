import { Injectable } from "@nestjs/common";
import { CreatePayslipDto } from "./dto/create-payslip.dto";
import { UpdatePayslipDto } from "./dto/update-payslip.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class PayslipService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePayslipDto) {
    return this.prisma.payslip.create({ data: dto });
  }

  findAll(where?: Prisma.PayslipWhereInput) {
    return this.prisma.payslip.findMany({
      where,
    });
  }

  findOne(id: string) {
    return this.prisma.payslip.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdatePayslipDto) {
    return this.prisma.payslip.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: string) {
    return this.prisma.payslip.delete({ where: { id } });
  }
}

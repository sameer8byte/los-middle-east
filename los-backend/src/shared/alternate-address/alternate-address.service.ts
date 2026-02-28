// src/alternate-address/alternate-address.service.ts
import { Injectable } from "@nestjs/common";

import { UpdateAlternateAddressDto } from "./dto/update-alternate-address.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateAlternateAddressDto } from "./dto/alternate-address.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class AlternateAddressService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateAlternateAddressDto) {
    return this.prisma.alternateAddress.create({ data });
  }

  findAll(where?: Prisma.AlternateAddressWhereInput) {
    return this.prisma.alternateAddress.findMany({
      where,
    });
  }

  findOne(id: string) {
    return this.prisma.alternateAddress.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateAlternateAddressDto) {
    return this.prisma.alternateAddress.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.alternateAddress.delete({ where: { id } });
  }

  findByUserId(userId: string) {
    return this.prisma.alternateAddress.findMany({
      where: { userId },
    });
  }
}

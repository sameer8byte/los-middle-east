import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateAlternatePhoneNumberDto } from "./dto/create-alternate-phone-number.dto";
import { UpdateAlternatePhoneNumberDto } from "./dto/update-alternate-phone-number.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class AlternatePhoneNumberService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAlternatePhoneNumberDto) {
    return this.prisma.alternatePhoneNumber.create({ data });
  }

  findAll(where?: Prisma.AlternatePhoneNumberWhereInput) {
    return this.prisma.alternatePhoneNumber.findMany({
      where,
    });
  }

  findByUser(userId: string) {
    return this.prisma.alternatePhoneNumber.findMany({ where: { userId } });
  }

  async findOne(id: string) {
    const record = await this.prisma.alternatePhoneNumber.findUnique({
      where: { id },
    });
    if (!record)
      throw new NotFoundException("Alternate phone number not found");
    return record;
  }

  async update(id: string, data: UpdateAlternatePhoneNumberDto) {
    await this.findOne(id); // ensure it exists
    return this.prisma.alternatePhoneNumber.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure it exists
    return this.prisma.alternatePhoneNumber.delete({ where: { id } });
  }
}

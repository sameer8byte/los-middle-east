// src/user-details/user-details.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserDetailsDto } from "./dto/create-user-details.dto";
import { UpdateUserDetailsDto } from "./dto/update-user-details.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UserDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateUserDetailsDto) {
    // Check if the user has a verified phone number
    return this.prisma.userDetails.upsert({
      where: {
        userId,
      },
      update: {
        ...dto,
      },
      create: {
        ...dto,
        userId,
      },
    });
  }

  findAll() {
    return this.prisma.userDetails.findMany();
  }

  findOne(id: string) {
    return this.prisma.userDetails.findUnique({ where: { id } });
  }

  findOneByUser(userId: string) {
    return this.prisma.userDetails.findUnique({ where: { userId } });
  }

  async update(id: string, dto: UpdateUserDetailsDto) {
    const exists = await this.prisma.userDetails.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("User details not found");
    const dob = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    const validDob =
      dob instanceof Date && !isNaN(dob.getTime()) ? dob : undefined;
    const { dateOfBirth, ...rest } = dto;
    return this.prisma.userDetails.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: validDob,
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.userDetails.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("User details not found");

    return this.prisma.userDetails.delete({ where: { id } });
  }
}

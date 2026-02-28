// src/user-device/user-device.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserDeviceDto } from "./dto/create-device.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(brandId: string, createUserDeviceDto: CreateUserDeviceDto) {
    // user details
    const userDevice = await this.prisma.devices.findFirst({
      where: {
        brandId,
        fpId: createUserDeviceDto.fpId,
        platformType: createUserDeviceDto.platformType,
      },
    });
    if (userDevice) {
      // update devices
      return userDevice;
    }
    return this.prisma.devices.create({
      data: {
        ...createUserDeviceDto,
        brandId,
        lastActiveAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), // Provide the updatedAt field
      },
    });
  }

  async remove(id: string) {
    try {
      return await this.prisma.devices.delete({ where: { id } });
    } catch (error) {
      if (error.code === "P2025")
        throw new NotFoundException("Device not found");
      throw error;
    }
  }
}

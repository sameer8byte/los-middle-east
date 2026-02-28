import { PrismaService } from "src/prisma/prisma.service";
import { CreatePanAadhaarVerificationDto } from "./dto/create-verification.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PanAadhaarService {
  constructor(private prisma: PrismaService) {}

  async findOne(documentId: string) {
    return this.prisma.panAadhaarVerification.findUnique({
      where: {
        documentId,
      },
    });
  }

  async createVerification(dto: CreatePanAadhaarVerificationDto) {
    const { address, ...verificationData } = dto;

    return this.prisma.panAadhaarVerification.create({
      data: {
        ...verificationData,
        dob: new Date(dto.dob),
        address: {
          create: {
            buildingName: address.buildingName,
            locality: address.locality,
            streetName: address.streetName,
            pincode: address.pincode,
            city: address.city,
            state: address.state,
            country: address.country,
          },
        },
      },
      include: {
        address: true,
      },
    });
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandsService } from "src/shared/brands/brands.service";

@Injectable()
export class ParterAdminService {
  constructor(
    private prisma: PrismaService,
    private readonly brandsService: BrandsService,
  ) {}

  async getAllBrands() {
    const brands = await this.prisma.brand.findMany({
      where: {
        onPartner: true,
      },
    });
    return brands;
  }
}

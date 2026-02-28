import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UtmService {
  constructor(private readonly prisma: PrismaService) {}

  // utmService
  async createUtmTracking(data: any): Promise<any> {
    const {
      utmSource,
      utmMedium,
      utmCampaign = "",
      utmContent = "",
      utmTerm = "",
      utmId = "",
      fbclid = "",
      clickid = "",
      userId,
      brandId,
    } = data;

    // Validate required fields
    if (!utmSource || !utmMedium) {
      throw new BadRequestException(
        "utmSource, utmMedium, and utmCampaign are required",
      );
    }
    return this.prisma.uTMTracking.upsert({
      where: {
        userId_utmMedium: {
          userId,
          utmMedium,
        },
      },
      update: {
        utmContent,
        utmTerm,
        clickid,
      },
      create: {
        utmSource,
        utmMedium,
        utmId,
        fbclid,
        clickid,
        utmCampaign,
        brandId,
        userId,
        utmContent,
        utmTerm,
      },
    });
  }
}

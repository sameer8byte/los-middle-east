// src/external/kycCart/mobileVerification/mobile-verification.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MobileVerificationService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('KYCCARTBASE_URL', '');
    this.apiKey = this.configService.get<string>('KYCCART_API_KEY', '');
  }

  async checkMobileAge(
    mobileNo: string,
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string,
  ) {
    try {
      // 1. First check in USER table
      const user = await this.prisma.user.findFirst({
        where: { id: userId, brandId },
        select: { phoneNumberAge: true },
      });

      if (user?.phoneNumberAge) {
        return user.phoneNumberAge; // return stored value
      }

      const url = `${this.baseUrl}/api/mobileVerification/mobileAge`;

      // 2. If not in DB, call external API
      const formData = new URLSearchParams();
      formData.append('mobileNo', mobileNo);
      if (checkId) formData.append('checkId', checkId);
      if (groupId) formData.append('groupId', groupId);

      const headers = {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const response = await firstValueFrom(
        this.httpService.post(url, formData.toString(), { headers }),
      );

      const mobileAgeData = response.data;

      // Assume the response contains age inside mobileAgeData.age
      const ageOnly = mobileAgeData?.age?.toString() || null;

      // 3a. Save full JSON into kyccart table
      await this.prisma.kyccart_some_table.create({
        data: {
          userId,
          brandId,
          mobileAge: mobileAgeData, // JSON field
        },
      });

      // 3b. Save only age into User table
      if (ageOnly) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { phoneNumberAge: ageOnly },
        });
      }

      return ageOnly || mobileAgeData;
    } catch (error) {
      console.error(
        'Mobile verification API error:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Failed to fetch mobile age details from Kyccart API',
      );
    }
  }
}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PersonalDetailsDto } from '../dto/personal-details.dto';

@Injectable()
export class PersonalDetailsService {
  private readonly logger = new Logger(PersonalDetailsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async savePersonalDetails(
    data: PersonalDetailsDto,
    phoneNumber: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const user = await this.prisma.user.findFirst({
      where: { phoneNumber },
      include: { userDetails: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update or create user details
    await this.prisma.userDetails.upsert({
      where: { userId: user.id },
      update: {
        firstName: data.first_name,
        middleName: data.middle_name || null,
        lastName: data.last_name,
        dateOfBirth: new Date(data.dob),
        fathersName: data.father_name,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
      create: {
        userId: user.id,
        firstName: data.first_name,
        middleName: data.middle_name || null,
        lastName: data.last_name,
        dateOfBirth: new Date(data.dob),
        fathersName: data.father_name,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
    });

    this.logger.log(`Personal details saved for user ${user.id}`);

    return {
      success: true,
      message: 'Personal details saved successfully',
    };
  }
}

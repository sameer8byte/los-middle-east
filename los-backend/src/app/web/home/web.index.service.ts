import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCallMeRequestDto } from "../../common/dto/create-call-me-request.dto";
import { UsersService } from "src/shared/user/user.service";

@Injectable()
export class WebIndexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UsersService,
  ) {}

  async getIndex(domain: string) {
    const brand = await this.prisma.brand.findFirst({
      where: {
        brand_sub_domains: {
          some: { subdomain: domain },
        },
        // domain: domain,
      },
      include: {
        brand_themes: true,
        brandDetails: true,
        brandPolicyLinks: true,
        brandConfig: true,
        brandCards: true,
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with domain ${domain} not found`);
    }

    return brand;
  }

  async getUser(userId: string) {
    const user = await this.userService.findOne(userId, {
      user_bank_account: {
        select: {
          id: true,
          isPrimary: true,
        },
      },
      userDetails: {
        select: {
          id: true,
        },
      },
      user_status_brand_reasons: {
        select: {
          id: true,
          userId: true,
          brandStatusReasonId: true,
          brand_status_reasons: {
            select: {
              id: true,
              brandId: true,
              reason: true,
              isDisabled: true,
              createdAt: true,
              updatedAt: true,
              isActive: true,
              type: true,
              status: true,
            },
          },
        },
      },
      employment: {
        select: {
          id: true,
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      onboardingStep: user.onboardingStep,
      isEmailVerified: user.isEmailVerified,
      brandId: user.brandId,
      isPhoneVerified: user.isPhoneVerified,
      googleId: user.googleId,
      isWhatsappVerified: user.isWhatsappVerified,
      employmentId: user.employment.id,
      userDetailsId: user.userDetails.id,
      userBankAccountId: user.user_bank_account[0]?.id,
      status_id: user.status_id,
      is_terms_accepted: user.is_terms_accepted,
      occupation_type_id: user.occupation_type_id,
      user_status_brand_reasons: user.user_status_brand_reasons,
    };
  }

  async getAllAlternatePhoneNumbers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const alternatePhoneNumbers =
      await this.prisma.alternatePhoneNumber.findMany({
        where: { userId: userId },
        select: {
          id: true,
          phone: true,
          label: true,
          isVerified: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          relationship: true,
          verificationType: true,
        },
      });
    return alternatePhoneNumbers
  }

  async getCallMeRequests(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.callMeRequest.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  //post call me request
  async createCallMeRequest(body: CreateCallMeRequestDto) {
    const { userId, message, phoneNumber, isResolved } = body;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const callMeRequest = await this.prisma.callMeRequest.create({
      data: {
        userId: userId,
        brandId: user.brandId,
        message: message,
        phoneNumber: phoneNumber,
        isResolved: isResolved,
        updatedAt: new Date(), // Assuming you want to set the same date for createdAt and
      },
    });

    return callMeRequest;
  }

  // update user profile (occupation type and other profile fields)
  async updateUserProfile(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updateData: any = {};

    // Update occupation type if provided
    if (data.occupationTypeId !== undefined) {
      updateData.occupation_type_id = data.occupationTypeId;
    }

    // Update user record
    if (Object.keys(updateData).length > 0) {
      return await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return user;
  }
}

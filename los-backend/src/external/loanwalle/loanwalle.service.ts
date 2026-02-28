import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { CreateLeadRequestDto } from "./dto/create-lead.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/shared/user/user.service";
import { UtmService } from "src/app/common/services/utm.services";
import { NotificationService } from "src/features/notification";
import { getRoleId, RoleEnum } from "src/constant/roles";
import { notification_priority_enum, platform_type } from "@prisma/client";
import { AutoAllocationUserService } from "src/features/autoAllocation/services/user.autoAllocation.service";

@Injectable()
export class LoanwalleService {
  private readonly logger = new Logger(LoanwalleService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly utmService: UtmService,
    private readonly notificationService: NotificationService,
    private readonly autoAllocationUserService: AutoAllocationUserService,
  ) {}

  async createLead(payload: CreateLeadRequestDto) {
    try {
      const lead = payload.lead;
      const pan = lead.pan;

      if (!pan) {
        throw new HttpException(
          { success: false, message: "PAN number is required" },
          HttpStatus.BAD_REQUEST,
        );
      }

      const brand = await this.prismaService.brand.findFirst();
      const brandSubDomain =
        await this.prismaService.brand_sub_domains.findFirst({
          where: {
            brandId: brand?.id,
            isPrimary: true,
            isActive: true,
          },
        });
      const brandConfig = await this.prismaService.brandConfig.findFirst({
        where: {
          brandId: brand?.id,
        },
        select: {
          user_auto_allocation: true,
          is_loan_onboarding: true,
          autoAllocationType: true,
        },
      });
      const autoAllocate = brandConfig?.user_auto_allocation || false;
      const isLoanOnboarding = brandConfig?.is_loan_onboarding || false;
      const autoAllocationType = brandConfig?.autoAllocationType;
      const brandId = brand?.id;

      if (!brandId) {
        throw new HttpException(
          { success: false, message: "Brand ID is required" },
          HttpStatus.BAD_REQUEST,
        );
      }

      const normalizedPhone = lead.mobile ? `+91${lead.mobile}` : undefined;

      // 🔍 Parallel existence checks (outside transaction)
      const [panExists, mobileExists] = await Promise.all([
        this.prismaService.document.findFirst({
          where: {
            documentNumber: pan,
            type: "PAN",
          },
        }),
        normalizedPhone
          ? this.prismaService.user.findFirst({
              where: {
                brandId: brandId,
                OR: [{ phoneNumber: normalizedPhone }, { email: lead.email }],
              },
            })
          : Promise.resolve(null),
      ]);

      if (panExists) {
        throw new HttpException(
          { success: false, message: "Lead with this PAN already exists" },
          HttpStatus.CONFLICT,
        );
      }

      if (mobileExists) {
        throw new HttpException(
          {
            success: false,
            message: "Lead with this mobile number or email already exists",
          },
          HttpStatus.CONFLICT,
        );
      }
      const user = await this.usersService.createUser(
        {
          phoneNumber: normalizedPhone,
          brandId: brandId,
          email: lead.email,
          brandSubDomainId: brandSubDomain.id,
        },
        true,
        false,
        true,
      );
      await this.utmService.createUtmTracking({
        utmSource: "LOANWALLE",
        utmCampaign: "MARKET_PLACE",
        utmMedium: "API",
        userId: user.id,
      });
      await this.prismaService.document.create({
        data: {
          type: "PAN",
          documentNumber: pan,
          userId: user.id,
        },
      });
      if (autoAllocate && !isLoanOnboarding) {
        try {
          const nextPartnerUser =
            await this.autoAllocationUserService.getNextPartnerUserForAllocation(
              brandId,
              brandConfig.autoAllocationType,
            );

          if (nextPartnerUser) {
            await this.autoAllocationUserService.allotUserToPartner(
              user.id,
              nextPartnerUser.id,
            );
            try {
              const partnerIds = [
                nextPartnerUser.id,
                nextPartnerUser.reportsToId,
              ].filter(Boolean);

              await this.notificationService.create({
                title: "New User Created & Allocated",
                message: `New user ${
                  user.formattedUserId
                } (Phone: ${payload.lead.mobile || "N/A"}, Email: ${payload.lead.email || "N/A"}) has been created and allocated to ${nextPartnerUser.name || "Unknown Partner"}.`,
                userId: user.id,
                partnerRoleId: getRoleId(RoleEnum.CREDIT_EXECUTIVE),
                priority: notification_priority_enum.LOW,
                targets: partnerIds.map((partnerId) => ({
                  partnerUserId: partnerId,
                  platform: platform_type.PARTNER,
                })),
              });
            } catch (notificationError) {
              this.logger.error(
                `Failed to send notification for new user creation: ${notificationError.message}`,
                notificationError.stack,
              );
            }
          }
        } catch (allocationError) {
          this.logger.error(
            `Failed to auto-allocate user ${user.id} to partner: ${allocationError.message}`,
            allocationError.stack,
          );
        }
      }

      return {
        success: true,
        message: "Lead created successfully",
        data: {
          loanId: user.loans[0]?.id,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const statusCode =
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = error?.response?.data?.message || error.message;

      this.logger.error(`Failed to create lead: ${errorMessage}`, error.stack);

      throw new HttpException(
        {
          success: false,
          message: `Failed to create lead: ${errorMessage}`,
          error: error?.response?.data || errorMessage,
        },
        statusCode,
      );
    }
  }

  async getLeadStatus(leadId: string) {
    try {
      if (!leadId) {
        throw new HttpException(
          {
            success: false,
            message: "Lead ID is required",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const loan = await this.prismaService.loan.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          status: true,
          amount: true,
          loanType: true,
          applicationDate: true,
          approvalDate: true,
          disbursementDate: true,
          closureDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!loan) {
        throw new HttpException(
          {
            success: false,
            message: "Lead not found",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: "Lead status retrieved successfully",
        data: loan,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const statusCode =
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = error.response?.data?.message || error.message;

      this.logger.error(
        `Failed to get lead status: ${errorMessage}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: `Failed to get lead status: ${errorMessage}`,
          error: error.response?.data || errorMessage,
        },
        statusCode,
      );
    }
  }
}


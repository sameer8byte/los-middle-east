import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  AddressProofEnum,
  brand_status_enum,
  document_status_enum,
  DocumentTypeEnum,
  loan_status_enum,
  platform_type,
  ReloanStatus,
  user_bank_verification_method,
  user_bank_verification_status,
  VerificationType,
} from "@prisma/client";
import { UserStatusEnum } from "src/constant/enum";
import { BsaReportService } from "src/features/bsaReport/bsaReport.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PrismaService } from "src/prisma/prisma.service";
import { getDateFilter } from "src/utils";
import { CreateBankAccountStatementDto } from "src/app/web/bank/dto/create-bank-statement";
import { v4 as uuidv4 } from "uuid";

import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { IndianStatesWithCapitals } from "src/constant/stateCode";
import { BankAccountStatementService } from "src/shared/bank-account-statement/bank-account-statement.service";
import { DocumentsService } from "src/shared/documents/documents.service";
import { EmploymentService } from "src/shared/employment/employment.service";
import { UpdateUserBankAccountDto } from "src/shared/user-bank-account/dto/update-user-bank-account.dto";
import { UserDetailsService } from "src/shared/user-details/user-details.service";
import { UsersService } from "src/shared/user/user.service";
import { SmsService } from "src/core/communication/services/sms.service";
import { OtpVerificationService } from "src/shared/otpVerification/otp-verification.service";
import { AlternatePhoneNumberService } from "src/shared/alternate-phone-number/alternate-phone-number.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";

import { UpsertDocumentUploadDto } from "../customers/dto/upsert-other-docs.dto";
import { UpsertEmploymentDto } from "../customers/dto/employment.dto";
import { CreateVerifiedDocumentUploadDto } from "../customers/dto/add-verified-docs.dto";
import { AddAlternatePhoneNumberDto } from "../customers/dto/add-alternate-phone-number.dto";
import { UpdateDocumentNumberDto } from "../customers/dto/update-document-number.dto";
import {
  CreateUserSalaryDto,
  UpdateUserSalaryDto,
} from "../customers/dto/user-salary.dto";
import { UserSalaryService } from "../customers/services/user-salary.service";
import { PhoneToUanService } from "src/external/phoneToUan/phoneToUan.service";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { DigiLocker20Service } from "src/external/digiLocker2.0";
import { RoleEnum } from "src/constant/roles";
import { PennyDropService } from "src/external/pennyDrop/pennyDrop.service";

@Injectable()
export class PartnerCustomerService {
  private readonly logger = new Logger(PartnerCustomerService.name);
  private readonly isDev: boolean = process.env.NODE_ENV !== "production";

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly bankAccountStatementService: BankAccountStatementService,
    private readonly userDetailsService: UserDetailsService,
    private readonly pennyDropService: PennyDropService,
    private readonly documentsService: DocumentsService,
    private readonly employmentService: EmploymentService,
    private readonly bsaReportService: BsaReportService,
    private readonly awsS3Service: AwsPublicS3Service, // Replace with actual type if available,
    private readonly smsService: SmsService,
    private readonly otpVerificationService: OtpVerificationService,
    private readonly phoneToUanService: PhoneToUanService,
    private readonly alternatePhoneNumberService: AlternatePhoneNumberService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
    private readonly digiLocker20Service: DigiLocker20Service,
    private readonly userSalaryService: UserSalaryService,
  ) { }

  async findAllUsers(
    brandId: string,
    partnerUser: AuthenticatedPartnerUser,
    paginationDto: PaginationDto,
    filter?: Record<string, string>,
  ) {
    const brandConfig = await this.prisma.brandConfig.findUnique({
      where: { brandId },
      select: {
        skip_user_onboarding_completed: true,
      },
    });
    const role = partnerUser?.roles[0];
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    const pDateFilter = (() => {
      try {
        return JSON.parse(paginationDto?.dateFilter || "[]");
      } catch {
        return [];
      }
    })();

    const pStats = (() => {
      try {
        return JSON.parse(filter?.status || "[]");
      } catch {
        return [];
      }
    })();

    const pKycStatus = (() => {
      try {
        return JSON.parse(filter?.kycStatus || "[]");
      } catch {
        return [];
      }
    })();
    const pUserReloanStatus = (() => {
      try {
        return JSON.parse(filter?.userReloanStatus || "[]");
      } catch {
        return [];
      }
    })();
    const pAllottedPartnerUserId = (() => {
      try {
        return JSON.parse(filter?.allottedPartnerUserIds || "[]");
      } catch {
        return [];
      }
    })();
    const pAllottedSupervisorIds = (() => {
      try {
        return JSON.parse(filter?.allottedSupervisorIds || "[]");
      } catch {
        return [];
      }
    })();

    // NEW: Parse salary min and max values
    const pSalaryMin = filter?.salaryMin
      ? parseFloat(filter.salaryMin.toString().trim())
      : null;
    const pSalaryMax = filter?.salaryMax
      ? parseFloat(filter.salaryMax.toString().trim())
      : null;

    const search = filter?.search?.trim() || "";

    const pLoanCount = filter?.loanCount || null;

    const dateFilter = getDateFilter(pDateFilter);

    // Build name search conditions based on number of words
    let nameConditions: any[] = [];

    if (search.length > 3) {
      const words = search.split(/\s+/);

      if (words.length === 1) {
        const word = words[0];
        nameConditions = [
          { firstName: { contains: word, mode: "insensitive" as const } },
          { middleName: { contains: word, mode: "insensitive" as const } },
          { lastName: { contains: word, mode: "insensitive" as const } },
        ];
      } else if (words.length >= 2) {
        nameConditions.push({
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            { lastName: { contains: words[1], mode: "insensitive" as const } },
          ],
        });
        nameConditions.push({
          AND: [
            { firstName: { contains: words[1], mode: "insensitive" as const } },
            { lastName: { contains: words[0], mode: "insensitive" as const } },
          ],
        });

        // Optionally add middleName matching if 3 or more words
        if (words.length >= 3) {
          nameConditions.push({
            AND: [
              {
                firstName: { contains: words[0], mode: "insensitive" as const },
              },
              {
                middleName: {
                  contains: words[1],
                  mode: "insensitive" as const,
                },
              },
              {
                lastName: { contains: words[2], mode: "insensitive" as const },
              },
            ],
          });
        }
      }
    }

    // ADDED: Correct loan filter per current brand
    const loanFilterCondition =
      pLoanCount === "0"
        ? {
            loans: {
              none: {
                brandId,
                status: {
                  not: loan_status_enum.ONBOARDING,
                },
              },
            },
          }
        : pLoanCount === ">0"
          ? {
              loans: {
                some: {
                  brandId,
                  status: {
                    not: loan_status_enum.ONBOARDING,
                  },
                },
              },
            }
          : null;
    // NEW: Dynamic salary filter based on min/max values
    let salaryCondition: any = null;

    if (pSalaryMin !== null || pSalaryMax !== null) {
      const salaryFilter: any = {};
      if (pSalaryMin !== null) salaryFilter.gte = pSalaryMin;
      if (pSalaryMax !== null) salaryFilter.lte = pSalaryMax;

      // If min is 0 and max is 0, we specifically want "No Salary" users
      if (pSalaryMin === 0 && pSalaryMax === 0) {
        salaryCondition = {
          OR: [
            { employment: null },
            { employment: { salary: null } },
            { employment: { salary: { lte: 0 } } },
          ],
        };
      } else {
        // STRICT RANGE: This ensures users MUST have a salary within the range
        // and ignores nulls/missing records unless the range starts at 0.
        salaryCondition = {
          employment: {
            salary: salaryFilter,
          },
        };
      }
    }

    // Check if we should skip customers with loans for CREDIT_EXECUTIVE role
    const skipCustomersWithLoans =
      brandConfig?.skip_user_onboarding_completed &&
      role === RoleEnum.CREDIT_EXECUTIVE;

    // Compose the final where filter
    const where = {
      brandId,
      isActive: true,
      AND: [
        Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : null,
        pStats.length > 0
          ? {
            // Filter by status_id (direct BigInt values from UserStatusEnum)
            status_id: {
              in: pStats.map(BigInt),
            },
          }
          : null,
        pKycStatus.length > 0 && {
          onboardingStep: pKycStatus.includes("kycCompleted")
            ? { gte: 11 }
            : { lte: 11 },
        },
        pUserReloanStatus.length > 0
          ? {
            userReloans: {
              some: {
                status: { in: pUserReloanStatus },
                isResolved: false,
              },
            },
          }
          : null,
        pAllottedPartnerUserId.length > 0
          ? pAllottedPartnerUserId.includes("NOT_ASSIGNED")
            ? {
              allocated_partner_user_id: null,
            }
            : {
              allocated_partner_user_id: { in: pAllottedPartnerUserId },
            }
          : null,
        pAllottedSupervisorIds.length > 0
          ? pAllottedSupervisorIds.includes("NOT_ASSIGNED")
            ? {
              allocated_partner_user_id: null,
            }
            : {
              allocated_partner_user_id: { in: pAllottedSupervisorIds },
            }
          : null,
        loanFilterCondition,
        skipCustomersWithLoans
          ? {
              loans: {
                none: {
                  status: { not: loan_status_enum.ONBOARDING },
                },
              },
            }
          : null,
        salaryCondition, // Updated salary condition
        search.length > 3
          ? {
            OR: [
              { id: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              {
                loans: {
                  some: {
                    OR: [
                      {
                        formattedLoanId: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        id: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        oldLoanId: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                    ],
                  },
                },
              },
              {
                formattedUserId: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                phoneNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                legacy_id: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                userDetails: {
                  OR: nameConditions,
                },
              },
              {
                documents: {
                  some: {
                    documentNumber: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
          : null,
      ].filter(Boolean), // remove null entries to avoid Prisma errors
    };
    const partnerUsers = await this.prisma.partnerUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          email: true,
          migrationStatus: true,
          phoneNumber: true,
          createdAt: true,
          formattedUserId: true,
          alternate_phone_1: true,
          alternate_phone_2: true,
          googleId: true,
          onboardingStep: true,
          isEmailVerified: true,
          status_id: true,
          is_terms_accepted: true,
          occupation_type_id: true,
          brandId: true,
          isPhoneVerified: true,
          isWhatsappVerified: true,
          allocated_partner_user_id: true,
          documents: {
            select: {
              id: true,
              type: true,
              status: true,
              createdAt: true,
              verifiedAt: true,
              documentNumber: true,
              leadMatches: {
                where: {
                  status: "ACTIVE",
                },
                select: {
                  id: true,
                  entityType: true,
                  matchType: true,
                  matchField: true,
                  confidence: true,
                  createdAt: true,
                  leadForm: {
                    select: {
                      id: true,
                      form_name: true,
                      campaign_name: true,
                      platform: true,
                    },
                  },
                },
              },
            },
          },
          brandSubDomain: {
            select: {
              marketingSource: true,
              subdomain: true,
            },
          },
          employment: {
            select: {
              salary: true,
            },
          },
          user_status_brand_reasons: {
            select: {
              id: true,
              brand_status_reasons: {
                select: {
                  id: true,
                  reason: true,
                  status: true,
                },
              },
            },
          },
          userDetails: {
            select: {
              firstName: true,
              userBlockAlert: true,
              middleName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
          onboardingJourneys: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          utmTracking: {
            select: {
              id: true,
              utmSource: true,
              utmMedium: true,
              utmCampaign: true,
            },
          },
          leadMatches: {
            where: {
              status: "ACTIVE",
            },
            select: {
              id: true,
              entityType: true,
              matchType: true,
              matchField: true,
              confidence: true,
              createdAt: true,
              userId: true,
              documentId: true,
              leadForm: {
                select: {
                  id: true,
                  form_name: true,
                  campaign_name: true,
                  platform: true,
                },
              },
            },
          },
          userReloans: {
            where: {
              status: "PENDING",
            },
            select: {
              id: true,
              status: true,
              createdAt: true,
              previousLoan: {
                select: {
                  formattedLoanId: true,
                  amount: true,
                },
              },
            },
          },
          loans: {
            where: { brandId },
            select: {
              id: true,
              formattedLoanId: true,
              amount: true,
              status: true,
              disbursementDate: true,
              createdAt: true,
              loanDetails: {
                select: {
                  durationDays: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Format the data
    const formattedData = data.map((user) => {
      const loans = user.loans.filter(
        (loan) => loan.status !== loan_status_enum.ONBOARDING,
      );

      // Combine lead matches from user and documents
      const allLeadMatches = [
        ...(user.leadMatches || []).map((m) => ({
          ...m,
          source: "user" as const,
        })), // Direct user matches
        ...(user.documents?.flatMap((doc) =>
          (doc.leadMatches || []).map((m) => ({
            ...m,
            source: "document" as const,
          })),
        ) || []), // Document-based matches
      ];

      // Fetch allocated partner details if exists
      const allocatedPartner = user.allocated_partner_user_id
        ? partnerUsers.find((pu) => pu.id === user.allocated_partner_user_id) ||
          null
        : null;

      return {
        id: user.id,
        email: user.email,
        migrationStatus: user.migrationStatus,

        name: `${user.userDetails?.firstName || ""} ${user.userDetails?.middleName || ""
          } ${user.userDetails?.lastName || ""}`.trim(),
        userBlockAlert: user.userDetails?.userBlockAlert || null,
        dateOfBirth: user.userDetails?.dateOfBirth || null,
        formattedUserId: user.formattedUserId,
        googleId: user.googleId,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        onboardingStep: user.onboardingStep,
        alternatePhone1: user.alternate_phone_1,
        alternatePhone2: user.alternate_phone_2,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isWhatsappVerified: user.isWhatsappVerified,
        status_id: user.status_id,
        is_terms_accepted: user.is_terms_accepted || false,
        occupation_type_id: user.occupation_type_id,
        brandSubDomain: user.brandSubDomain,
        documents:
          user.documents?.map((doc) => ({
            id: doc.id,
            type: doc.type,
            status: doc.status,
            createdAt: doc.createdAt,
            verifiedAt: doc.verifiedAt,
            documentNumber: doc.documentNumber,
          })) || [],
        utmTracking: user.utmTracking,
        leadMatches: allLeadMatches.length, // Count of all active lead matches
        leadMatchesDetails: allLeadMatches.map((match) => ({
          id: match.id,
          entityType: match.entityType,
          matchType: match.matchType,
          matchField: match.matchField,
          confidence: match.confidence,
          hasUserId: "userId" in match ? !!match.userId : false,
          hasDocumentId: "documentId" in match ? !!match.documentId : false,
          leadFormName: match.leadForm?.form_name,
          campaignName: match.leadForm?.campaign_name,
          platform: match.leadForm?.platform,
          createdAt: match.createdAt,
        })),
        onboardingJourneys: user.onboardingJourneys || [],
        userReloans: user.userReloans || [],
        allocatedPartnerUserId: user.allocated_partner_user_id,
        allocatedPartner: allocatedPartner,
        loanCount: loans?.length || 0,
        loans: loans || [],
        Salary: user.employment?.salary || null,
      };
    });

    return {
      users: formattedData,
      meta: {
        total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findUserById(id: string) {
    const user = await this.usersService.findOne(id, {
      onboardingJourneys: true,
      userDetails: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
        },
      },
    });
    return user;
  }

  async getUserDeviceInfo(userId: string) {
    try {
      // Get the oldest login token with deviceId
      const oldestToken = await this.prisma.userLoginToken.findFirst({
        where: {
          userId: userId,
          deviceId: { not: null },
          isLoggedOut: false,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          deviceId: true,
          createdAt: true,
        },
      });

      if (!oldestToken || !oldestToken.deviceId) {
        return null;
      }

      // Get device details using the deviceId
      const device = await this.prisma.devices.findUnique({
        where: {
          id: oldestToken.deviceId,
        },
      });

      if (!device) {
        return null;
      }
      function getMobileOS(userAgent: string): "android" | "ios" | "other" {
        const ua = userAgent.toLowerCase();

        if (/android/.test(ua)) {
          return "android";
        }

        // iOS devices have multiple possible identifiers
        if (/iphone|ipad|ipod/.test(ua)) {
          return "ios";
        }

        return "other";
      }

      return {
        deviceType: device.deviceType,
        osType: getMobileOS(device.userAgent || ""),
        ipAddress: device.ipAddress,
      };
    } catch (error) {
      console.error("Error fetching user device info:", error);
      return null;
    }
  }

  async searchUserByFormattedId(
    brandId: string,
    formattedUserId: string,
    partnerUser: AuthenticatedPartnerUser,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        formattedUserId: formattedUserId,
        brandId: brandId,
      },
      include: {
        userDetails: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with FormattedUserId '${formattedUserId}' not found`,
      );
    }

    // Fetch partner user details if allocated
    let allottedPartner = null;
    if (user.allocated_partner_user_id) {
      allottedPartner = await this.prisma.partnerUser.findUnique({
        where: { id: user.allocated_partner_user_id },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      formattedUserId: user.formattedUserId,
      createdAt: user.createdAt,
      userDetails: user.userDetails,
      allottedPartner,
    };
  }

  async getUserDetails(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          utmTracking: {
            select: {
              utmSource: true,
              utmMedium: true,
              utmCampaign: true,
            },
          },

          brandSubDomain: {
            select: {
              subdomain: true,
            },
          },
          userDetails: true,
        },
      });

      if (!user?.userDetails) {
        throw new NotFoundException(
          `User details not found for user ${userId}`,
        );
      }
      return {
        ...user.userDetails,
        marketingSource:
          `${user.utmTracking[0]?.utmSource || ""} ${user.utmTracking[0]?.utmMedium || ""
            } ${user.utmTracking[0]?.utmCampaign || ""}`.trim() || null,
        subdomain: user.brandSubDomain?.subdomain || null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to fetch user details",
      );
    }
  }

  async updateResidenceType(
    userId: string,
    residenceType: string,
    partnerUserId?: string,
  ) {
    try {
      const userDetails = await this.prisma.userDetails.findUnique({
        where: { userId },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User not found with id ${userId}`);
      }
      if (!user.brandId) {
        throw new NotFoundException(`User brandId not found with id ${userId}`);
      }
      if (!userDetails) {
        throw new NotFoundException(
          `User details not found for user ${userId}`,
        );
      }

      // Validate that residenceType is a valid enum value
      const validTypes = ["RENTED", "OWNED"];
      if (!validTypes.includes(residenceType.toUpperCase())) {
        throw new BadRequestException(
          `Invalid residence type. Must be one of: ${validTypes.join(", ")}`,
        );
      }

      const updatedUserDetails = await this.prisma.userDetails.update({
        where: { userId },
        data: { residenceType: residenceType.toUpperCase() as any },
      });

      if (partnerUserId && this.awsAuditLogsSqsService) {
        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user?.brandId || "",
          partnerUserId: partnerUserId,
          platformType: platform_type.PARTNER,
          message: `Residence type updated to ${residenceType} by partner`,
          context: {
            residenceType: updatedUserDetails.residenceType,
          },
        });
      }

      return {
        success: true,
        message: "Residence type updated successfully",
        data: updatedUserDetails,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to update residence type",
      );
    }
  }

  async updateGender(userId: string, gender: string, partnerUserId?: string) {
    try {
      const userDetails = await this.prisma.userDetails.findUnique({
        where: { userId },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User not found with id ${userId}`);
      }
      if (!user.brandId) {
        throw new NotFoundException(`User brandId not found with id ${userId}`);
      }
      if (!userDetails) {
        throw new NotFoundException(
          `User details not found for user ${userId}`,
        );
      }

      // Validate that gender is a valid enum value
      const validGenders = ["MALE", "FEMALE", "OTHER"];
      if (!validGenders.includes(gender.toUpperCase())) {
        throw new BadRequestException(
          `Invalid gender. Must be one of: ${validGenders.join(", ")}`,
        );
      }

      const updatedUserDetails = await this.prisma.userDetails.update({
        where: { userId },
        data: { gender: gender.toUpperCase() as any },
      });

      if (partnerUserId) {
        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user?.brandId || "",
          partnerUserId: partnerUserId,
          message: `Gender updated to ${gender} by partner`,
          platformType: platform_type.PARTNER,

          context: {
            gender: updatedUserDetails.gender,
          },
        });
      }

      return {
        success: true,
        message: "Gender updated successfully",
        data: updatedUserDetails,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to update gender",
      );
    }
  }

  async updateReligion(
    userId: string,
    religion: string,
    partnerUserId?: string,
  ) {
    try {
      const userDetails = await this.prisma.userDetails.findUnique({
        where: { userId },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User not found with id ${userId}`);
      }
      if (!user.brandId) {
        throw new NotFoundException(`User brandId not found with id ${userId}`);
      }
      if (!userDetails) {
        throw new NotFoundException(
          `User details not found for user ${userId}`,
        );
      }

      // Validate that religion is a valid enum value
      const validReligions = [
        "HINDUISM",
        "ISLAM",
        "SIKHISM",
        "CHRISTIANITY",
        "BUDDHISM",
        "JAINISM",
        "OTHER",
      ];
      if (!validReligions.includes(religion.toUpperCase())) {
        throw new BadRequestException(
          `Invalid religion. Must be one of: ${validReligions.join(", ")}`,
        );
      }

      const updatedUserDetails = await this.prisma.userDetails.update({
        where: { userId },
        data: { religion: religion.toUpperCase() as any },
      });

      if (partnerUserId) {
        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user?.brandId || "",
          partnerUserId: partnerUserId,
          message: `Religion updated to ${religion} by partner`,
          platformType: platform_type.PARTNER,

          context: {
            religion: updatedUserDetails.religion,
          },
        });
      }

      return {
        success: true,
        message: "Religion updated successfully",
        data: updatedUserDetails,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to update religion",
      );
    }
  }

  async updateMaritalStatus(
    userId: string,
    maritalStatus: string,
    partnerUserId?: string,
  ) {
    try {
      const userDetails = await this.prisma.userDetails.findUnique({
        where: { userId },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User not found with id ${userId}`);
      }
      if (!user.brandId) {
        throw new NotFoundException(`User brandId not found with id ${userId}`);
      }
      if (!userDetails) {
        throw new NotFoundException(
          `User details not found for user ${userId}`,
        );
      }

      // Validate that maritalStatus is a valid enum value
      const validStatuses = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"];
      if (!validStatuses.includes(maritalStatus.toUpperCase())) {
        throw new BadRequestException(
          `Invalid marital status. Must be one of: ${validStatuses.join(", ")}`,
        );
      }

      const updatedUserDetails = await this.prisma.userDetails.update({
        where: { userId },
        data: { maritalStatus: maritalStatus.toUpperCase() as any },
      });

      if (partnerUserId) {
        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user?.brandId || "",
          partnerUserId: partnerUserId,
          message: `Marital status updated to ${maritalStatus} by partner`,
          platformType: platform_type.PARTNER,

          context: {
            maritalStatus: updatedUserDetails.maritalStatus,
          },
        });
      }

      return {
        success: true,
        message: "Marital status updated successfully",
        data: updatedUserDetails,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to update marital status",
      );
    }
  }

  async updateDateOfBirth(
    userId: string,
    dateOfBirth: string,
    partnerUserId?: string,
  ) {
    try {
      const userDetails = await this.prisma.userDetails.findUnique({
        where: { userId },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User not found with id ${userId}`);
      }
      if (!user.brandId) {
        throw new NotFoundException(`User brandId not found with id ${userId}`);
      }
      if (!userDetails) {
        throw new NotFoundException(
          `User details not found for user ${userId}`,
        );
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateOfBirth)) {
        throw new BadRequestException(
          "Invalid date format. Please use YYYY-MM-DD",
        );
      }

      const parsedDate = new Date(dateOfBirth);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid date value");
      }

      const updatedUserDetails = await this.prisma.userDetails.update({
        where: { userId },
        data: { dateOfBirth: parsedDate },
      });

      if (partnerUserId) {
        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user?.brandId || "",
          partnerUserId: partnerUserId,
          message: `Date of birth updated to ${dateOfBirth} by partner`,
          platformType: platform_type.PARTNER,

          context: {
            dateOfBirth: updatedUserDetails.dateOfBirth,
          },
        });
      }

      return {
        success: true,
        message: "Date of birth updated successfully",
        data: updatedUserDetails,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to update date of birth",
      );
    }
  }

  async updateAlternatePhone1(
    userId: string,
    alternatePhone1: string,
    partnerUserId?: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User not found with id ${userId}`);
      }
      if (!user.brandId) {
        throw new NotFoundException(`User brandId not found with id ${userId}`);
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^[0-9\+\-\s]{7,15}$/;
      if (!phoneRegex.test(alternatePhone1)) {
        throw new BadRequestException(
          "Invalid phone number format. Must be 7-15 characters.",
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { alternate_phone_1: alternatePhone1 },
      });

      if (partnerUserId) {
        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user?.brandId || "",
          partnerUserId: partnerUserId,
          message: `Alternate phone 1 updated to ${alternatePhone1} by partner`,
          platformType: platform_type.PARTNER,

          context: {
            alternate_phone_1: updatedUser.alternate_phone_1,
          },
        });
      }

      return {
        success: true,
        message: "Alternate phone 1 updated successfully",
        data: updatedUser,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to update alternate phone 1",
      );
    }
  }

  async updateAlternatePhone2(
    userId: string,
    alternatePhone2: string,
    partnerUserId?: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User not found with id ${userId}`);
      }
      if (!user.brandId) {
        throw new NotFoundException(`User brandId not found with id ${userId}`);
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^[0-9\+\-\s]{7,15}$/;
      if (!phoneRegex.test(alternatePhone2)) {
        throw new BadRequestException(
          "Invalid phone number format. Must be 7-15 characters.",
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { alternate_phone_2: alternatePhone2 },
      });

      if (partnerUserId) {
        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user?.brandId || "",
          partnerUserId: partnerUserId,
          message: `Alternate phone 2 updated to ${alternatePhone2} by partner`,
          platformType: platform_type.PARTNER,

          context: {
            alternate_phone_2: updatedUser.alternate_phone_2,
          },
        });
      }

      return {
        success: true,
        message: "Alternate phone 2 updated successfully",
        data: updatedUser,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error?.message || "Failed to update alternate phone 2",
      );
    }
  }

  async getUserDocuments(userId: string) {
    const [
      documents,
      otherDocuments,
      payslips,
      accountStatements,
      userProfile,
    ] = await Promise.all([
      this.prisma.document.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          verifiedAt: true,
          backDocumentUrl: true,
          frontDocumentUrl: true,
          documentNumber: true,
          verificationNotes: true,
          frontPassword: true,
          backPassword: true,
          panAadhaarVerification: true,
          providerData: true,
        },
      }),
      this.prisma.otherDocument.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          verifiedAt: true,
          backDocumentUrl: true,
          backPassword: true,
          frontPassword: true,
          isApprovedByAdmin: true,
          verificationNotes: true,
          frontDocumentUrl: true,
          documentNumber: true,
          providerData: true,
        },
      }),
      this.prisma.payslip.findMany({ where: { userId } }),
      this.prisma.bankAccountStatement.findMany({ where: { userId } }),
      this.prisma.userDetails.findUnique({
        where: { userId },
        select: { profilePicUrl: true, profileVideoUrl: true },
      }),
    ]);

    return {
      documents,
      payslips,
      accountStatements,
      userProfile: {
        profilePicUrl: userProfile?.profilePicUrl || "",
        profileVideoUrl: userProfile?.profileVideoUrl || "",
      },
      otherDocuments,
    };
  }

  async getUserSignedDocuments(userId: string) {
    const loanAgreements = await this.prisma.loanAgreement.findMany({
      where: {
        loan: { user: { id: userId } },
        status: "SIGNED",
      },
      select: {
        id: true,
        signedFilePrivateKey: true,
        loan: {
          select: {
            id: true,
            formattedLoanId: true,
            amount: true,
            status: true,
            disbursementDate: true,
            createdAt: true,
            loanDetails: { select: { durationDays: true } },
          },
        },
      },
    });

    // Early return if no loan agreements
    if (loanAgreements.length === 0) {
      return {
        signedDocuments: [],
      };
    }

    const agreementIds = loanAgreements.map((agreement) => agreement.id);

    // Fetch PDF blobs from all three e-sign providers in parallel
    const [signDeskEntries, signzyEntries, digitapEntries] = await Promise.all([
      this.prisma.signDeskSomeTable.findMany({
        where: {
          loanAgreementsId: { in: agreementIds },
          pdfBlob: { not: null },
        },
        select: { loanAgreementsId: true, pdfBlob: true },
      }),
      this.prisma.signzy_some_table.findMany({
        where: {
          loanAgreementId: { in: agreementIds },
          pdfBlob: { not: null },
        },
        select: { loanAgreementId: true, pdfBlob: true },
      }),
      this.prisma.digitap_esign_some_table.findMany({
        where: {
          loanAgreementId: { in: agreementIds },
          pdfBlob: { not: null },
        },
        select: { loanAgreementId: true, pdfBlob: true },
      }),
    ]);

    // Create combined blob maps for efficient lookup
    const blobMaps = {
      signDesk: new Map(
        signDeskEntries.map((e) => [
          e.loanAgreementsId,
          { blob: e.pdfBlob, provider: "SIGNDESK" as const },
        ]),
      ),
      signzy: new Map(
        signzyEntries.map((e) => [
          e.loanAgreementId,
          { blob: e.pdfBlob, provider: "SIGNZY" as const },
        ]),
      ),
      digitap: new Map(
        digitapEntries.map((e) => [
          e.loanAgreementId,
          { blob: e.pdfBlob, provider: "DIGITAP" as const },
        ]),
      ),
    };

    // Transform agreements with optimized lookups
    const signedDocuments = loanAgreements.map((agreement) => {
      const signDeskData = blobMaps.signDesk.get(agreement.id);
      if (signDeskData) {
        return {
          signedFilePrivateKey: agreement.signedFilePrivateKey,
          loanFormattedId: agreement.loan?.formattedLoanId,
          agreementId: agreement.id,
          pdfBlob: signDeskData.blob,
          provider: signDeskData.provider,
          loanDetails: agreement.loan,
        };
      }

      const signzyData = blobMaps.signzy.get(agreement.id);
      if (signzyData) {
        return {
          signedFilePrivateKey: agreement.signedFilePrivateKey,
          loanFormattedId: agreement.loan?.formattedLoanId,
          agreementId: agreement.id,
          pdfBlob: signzyData.blob,
          provider: signzyData.provider,
          loanDetails: agreement.loan,
        };
      }

      const digitapData = blobMaps.digitap.get(agreement.id);
      if (digitapData) {
        return {
          signedFilePrivateKey: agreement.signedFilePrivateKey,
          loanFormattedId: agreement.loan?.formattedLoanId,
          agreementId: agreement.id,
          pdfBlob: digitapData.blob,
          provider: digitapData.provider,
          loanDetails: agreement.loan,
        };
      }

      return {
        signedFilePrivateKey: agreement.signedFilePrivateKey,
        loanFormattedId: agreement.loan?.formattedLoanId,
        agreementId: agreement.id,
        pdfBlob: null,
        provider: null,
        loanDetails: agreement.loan,
      };
    });

    return {
      signedDocuments,
    };
  }

  async getUserNoDueCertificates(userId: string) {
    // Fetch user's loans to get loan IDs
    const userLoans = await this.prisma.loan.findMany({
      where: { userId },
      select: {
        id: true,
        formattedLoanId: true,
        status: true,
      },
    });

    // Get loan IDs for fetching no due certificates
    const loanIds = userLoans.map((loan) => loan.id);

    // If no loans, return empty array
    if (loanIds.length === 0) {
      return {
        noDueCertificates: [],
      };
    }

    // Fetch no due certificates for the user's loans
    const noDueCertificates = await this.prisma.loanNoDueCertificate.findMany({
      where: {
        loanId: { in: loanIds },
        certificateFileUrl: { not: null }, // Only include certificates with URLs
      },
      select: {
        id: true,
        loanId: true,
        certificateFileUrl: true,
        issuedDate: true,
        issuedBy: true,
        remarks: true,
        certificateType: true,
        formattedNoDueId: true,
      },
    });

    return {
      noDueCertificates: noDueCertificates.map((cert) => ({
        id: cert.id,
        loanId: cert.loanId,
        certificateFileUrl: cert.certificateFileUrl,
        issuedDate: cert.issuedDate,
        issuedBy: cert.issuedBy,
        remarks: cert.remarks,
        certificateType: cert.certificateType,
        formattedNoDueId: cert.formattedNoDueId,
        loanFormattedId: userLoans.find((loan) => loan.id === cert.loanId)
          ?.formattedLoanId,
      })),
    };
  }

  async getUserBankAccount(userId: string) {
    const userBankAccount = await this.prisma.userBankAccount.findMany({
      where: {
        userId: userId,
      },
      include: {
        BankAccountStatement: true,
      },
    });
    return userBankAccount;
  }

  async getUserEmploymentDetails(userId: string, brandId: string) {
    // Get employment first
    const employment = await this.employmentService.findByUserId(userId);

    if (!employment) {
      return null;
    }

    // If UAN already exists, return immediately
    if (employment.uanNumber) {
      return employment;
    }

    this.triggerBackgroundUanFetch(userId, brandId, employment.id).catch(
      (error) => {
        console.error(`Background UAN fetch failed:`, error.message);
      },
    );

    // Return employment immediately without UAN
    return employment;
  }

  private async triggerBackgroundUanFetch(
    userId: string,
    brandId: string,
    employmentId: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true },
      });

      if (!user?.phoneNumber) return;

      // Check existing logs first
      const existingLog = await this.phoneToUanService.getExistingUanFromLogs(
        userId,
        brandId,
      );
      if (existingLog?.uan) {
        await this.employmentService.update(employmentId, {
          uanNumber: existingLog.uan,
        });
        return;
      }
    } catch (error) {
      console.error(
        `Background UAN fetch failed for user ${userId}:`,
        error.message,
      );
    }
  }

  //upsert user Employment
  async upsertUserEmployment(
    userId: string,
    data: UpsertEmploymentDto,
    partnerUserId: string,
  ) {
    // Validate user exists
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const employment = await this.prisma.employment.upsert({
      where: { userId: userId },
      update: {
        companyName: data.companyName,
        designation: data.designation,
        officialEmail: data.officialEmail,
        salary: data.salary,
        salaryExceedsBase: data.salaryExceedsBase,
        joiningDate: data.joiningDate,
        pinCode: data.pinCode,
        uanNumber: data.uanNumber,
        expectedDateOfSalary: Number(data.expectedDateOfSalary),
        modeOfSalary: data.modeOfSalary,
        companyAddress: data.companyAddress,
      },
      create: {
        userId: userId,
        companyName: data.companyName,
        designation: data.designation,
        officialEmail: data.officialEmail,
        salary: data.salary,
        salaryExceedsBase: data.salaryExceedsBase,
        joiningDate: data.joiningDate,
        pinCode: data.pinCode,
        uanNumber: data.uanNumber,
        expectedDateOfSalary: Number(data.expectedDateOfSalary),
        modeOfSalary: data.modeOfSalary,
        companyAddress: data.companyAddress,
      },
    });
    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userId,
      type: "LoanApplicationEmploymentInfo",
      brandId: user.brandId,
      partnerUserId: partnerUserId,
      message: `Employment details updated by partner`,

      platformType: platform_type.PARTNER,

      context: {
        employmentId: employment.id,
        companyName: employment.companyName,
        designation: employment.designation,
        officialEmail: employment.officialEmail,
        salary: employment.salary,
        expectedDateOfSalary: employment.expectedDateOfSalary,
        salaryExceedsBase: employment.salaryExceedsBase,
        joiningDate: employment.joiningDate,
        pinCode: employment.pinCode,
        uanNumber: employment.uanNumber,
        modeOfSalary: employment.modeOfSalary,
        companyAddress: employment.companyAddress,
      },
    });
    return employment;
  }

  async getUserSummary(userId: string, brandId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userDetails: true,
        user_bank_account: {
          where: {
            userId: userId,
          },
          include: {
            BankAccountStatement: {
              select: {
                id: true,
                createdAt: true,
                fromDate: true,
                toDate: true,
                filePrivateKey: true,
                filePassword: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            verifiedAt: true,
            documentNumber: true,
            providerData: true,
            leadMatches: {
              where: {
                status: "ACTIVE",
                documentId: { not: null }, // Document-based matches
              },
              select: {
                id: true,
                entityType: true,
                matchType: true,
                matchField: true,
                matchValue: true,
                confidence: true,
                createdAt: true,
                userId: true,
                documentId: true,
                leadForm: {
                  select: {
                    id: true,
                    form_name: true,
                    campaign_name: true,
                    platform: true,
                  },
                },
              },
            },
          },
        },
        employment: {
          include: {
            payslips: true,
          },
        },
        userReloans: {
          include: {
            previousLoan: {
              select: {
                formattedLoanId: true,
                amount: true,
              },
            },
          },
        },
        userGeoTags: true,
        leadMatches: {
          where: {
            status: "ACTIVE",
            userId: { not: null },
          },
          select: {
            id: true,
            entityType: true,
            matchType: true,
            matchField: true,
            matchValue: true,
            confidence: true,
            createdAt: true,
            userId: true,
            documentId: true,
            leadForm: {
              select: {
                id: true,
                form_name: true,
                campaign_name: true,
                platform: true,
              },
            },
          },
        },
        cartSomeTable: true, // Adjust this based on your actual table name
        equifaxSomeTable: true, // Adjust this based on your actual table name
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Fetch allocated partner details if exists
    let allocatedPartner = null;
    if (user.allocated_partner_user_id) {
      allocatedPartner = await this.prisma.partnerUser.findUnique({
        where: { id: user.allocated_partner_user_id },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          reportsToId: true,
        },
      });
    }

    const allLeadMatches = [
      ...(user.leadMatches || []),
      ...(user.documents?.flatMap((doc) => doc.leadMatches || []) || []),
    ];

    const formattedSummery = {
      id: user.id,
      migrationStatus: user.migrationStatus,
      email: user.email,
      name: `${user.userDetails?.firstName || ""} ${user.userDetails?.middleName || ""
        } ${user.userDetails?.lastName || ""}`,
      userBlockAlert: user.userDetails?.userBlockAlert || null,
      dateOfBirth: user.userDetails?.dateOfBirth || null,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
      onboardingStep: user.onboardingStep,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isWhatsappVerified: user.isWhatsappVerified,
      status_id: user.status_id,
      is_terms_accepted: user.is_terms_accepted,
      occupation_type_id: user.occupation_type_id,
      documents: user.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        createdAt: doc.createdAt,
        verifiedAt: doc.verifiedAt,
        providerData: doc.providerData,
      })),
      employment: {
        id: user.employment?.id,
        companyName: user.employment?.companyName,
        designation: user.employment?.designation,
        officialEmail: user.employment?.officialEmail,
        salary: user.employment?.salary,
        expectedDateOfSalary: user.employment?.expectedDateOfSalary,
        salaryExceedsBase: user.employment?.salaryExceedsBase,
        joiningDate: user.employment?.joiningDate,
        payslips: user.employment?.payslips.map((payslip) => ({
          id: payslip.id,
          createdAt: payslip.createdAt,
          filePrivateKey: payslip.filePrivateKey,
          month: payslip.month,
          year: payslip.year,
        })),
      },
      bankAccount: user.user_bank_account.map((account) => ({
        id: account.id,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        accountHolderName: account.accountHolderName,
        bankName: account.bankName,
        statements: account.BankAccountStatement.map((statement) => ({
          id: statement.id,
          createdAt: statement.createdAt,
          fromDate: statement.fromDate,
          toDate: statement.toDate,
          filePrivateKey: statement.filePrivateKey,
          filePassword: statement.filePassword,
        })),
      })),
      userGeoTags: user.userGeoTags.map((geoTag) => ({
        id: geoTag.id,
        latitude: geoTag.latitude,
        longitude: geoTag.longitude,
        notes: geoTag.notes,
        address: geoTag.address,
        city: geoTag.city,
        country: geoTag.country,
        district: geoTag.district,
        postalCode: geoTag.postalCode,
        state: geoTag.state,
        street: geoTag.street,
        sublocality: geoTag.sublocality,
        createdAt: geoTag.createdAt,
      })),
      userReloans: user.userReloans,
      leadMatches: allLeadMatches.length, // Count of all active lead matches
      leadMatchesDetails: allLeadMatches.map((match) => ({
        id: match.id,
        entityType: match.entityType,
        matchType: match.matchType,
        matchField: match.matchField,
        confidence: match.confidence,
        hasUserId: !!match.userId,
        hasDocumentId: !!match.documentId,
        leadFormName: match.leadForm?.form_name,
        campaignName: match.leadForm?.campaign_name,
        platform: match.leadForm?.platform,
        createdAt: match.createdAt,
      })),
      allocatedPartner,
    };

    return formattedSummery;
  }
  // repayment_timeline
  async getUserRepaymentTimeline(userId: string, brandId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const repaymentTimeline = await this.prisma.repaymentTimeline.findMany({
      where: {
        userId: userId,
      },
      include: {
        loan: {
          select: {
            formattedLoanId: true,
          },
        },
        partnerUser: true,
        user: true,
        userCall: {
          include: {
            recordings: true,
          },
        },
      },
    });
    return repaymentTimeline;
  }
  async getAlternatePhoneNumber(userId: string) {
    const alternatePhoneNumber =
      await this.prisma.alternatePhoneNumber.findMany({
        where: {
          userId: userId,
        },
      });
    return alternatePhoneNumber;
  }

  async getAlternatePhoneLoans(userId: string) {
    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        userDetails: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    const originalUserName = [
      user?.userDetails?.firstName,
      user?.userDetails?.middleName,
      user?.userDetails?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const alternatePhoneNumbers =
      await this.prisma.alternatePhoneNumber.findMany({
        where: { userId },
        select: {
          phone: true,
          name: true,
          relationship: true,
        },
      });

    const alternatePhoneCount = alternatePhoneNumbers.length;
    const totalPhoneCount = alternatePhoneCount + 1; // +1 for primary phone

    if (totalPhoneCount <= 1) {
      return {
        hasAlternateNumbers: false,
        alternatePhoneCount: 0,
        alternatePhoneNumbers: [],
        loansViaAlternateNumbers: [],
        originalUserName: originalUserName || null,
      };
    }

    const phones = alternatePhoneNumbers
      .map((apn) => apn.phone)
      .filter((p): p is string => !!p);

    if (!phones.length) {
      return {
        hasAlternateNumbers: true,
        alternatePhoneCount,
        alternatePhoneNumbers,
        loansViaAlternateNumbers: [],
        originalUserName: originalUserName || null,
      };
    }

    const matchedUsers = await this.prisma.user.findMany({
      where: {
        phoneNumber: { in: phones },
        id: { not: userId },
      },
      select: {
        id: true,
        formattedUserId: true,
        phoneNumber: true,
        userDetails: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        loans: {
          where: { isActive: true },
          select: {
            id: true,
            formattedLoanId: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const loansViaAlternateNumbers = matchedUsers.flatMap((matchedUser) => {
      const viaAlt = alternatePhoneNumbers.find(
        (apn) => apn.phone === matchedUser.phoneNumber,
      );

      if (!matchedUser.loans.length) return [];

      const userName = [
        matchedUser.userDetails?.firstName,
        matchedUser.userDetails?.middleName,
        matchedUser.userDetails?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      return matchedUser.loans.map((loan) => ({
        loanId: loan.id,
        formattedLoanId: loan.formattedLoanId,
        amount: loan.amount,
        status: loan.status,
        createdAt: loan.createdAt,
        matchedUser: {
          id: matchedUser.id,
          formattedUserId: matchedUser.formattedUserId,
          phoneNumber: matchedUser.phoneNumber,
          name: userName || null,
        },
        viaAlternatePhone: viaAlt || null,
      }));
    });

    return {
      hasAlternateNumbers: true,
      alternatePhoneCount,
      alternatePhoneNumbers,
      loansViaAlternateNumbers,
      originalUserName: originalUserName || null,
    };
  }

  async addAlternatePhoneNumber(
    userId: string,
    brandId: string,
    partnerUserId: string,
    data: AddAlternatePhoneNumberDto,
  ) {
    // 1. Validate User
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 2. Check if phone number already exists for this user
    const existingPhone = await this.prisma.alternatePhoneNumber.findFirst({
      where: {
        userId,
        phone: data.phone,
        isVerified: true,
      },
    });

    if (existingPhone) {
      throw new BadRequestException(
        "This phone number is already added for this user",
      );
    }

    // 3. Create the alternate phone number
    const verificationType = data.verificationType || VerificationType.OTP;
    const isVoiceCall = verificationType === VerificationType.VOICE_CALL;

    const alternatePhoneNumber = await this.prisma.alternatePhoneNumber.upsert({
      where: {
        userId_phone: {
          userId,
          phone: data.phone,
        },
      },
      update: {
        label: data.label,
        name: data.name,
        relationship: data.relationship,
        verificationType,
        isVerified: isVoiceCall, // Auto-verify voice calls
        verifiedAt: isVoiceCall ? new Date() : null,
      },
      create: {
        userId,
        phone: data.phone,
        label: data.label,
        name: data.name,
        relationship: data.relationship,
        verificationType,
        isVerified: isVoiceCall, // Auto-verify voice calls
        verifiedAt: isVoiceCall ? new Date() : null,
      },
    });

    // 4. Send verification only for OTP method
    if (!isVoiceCall) {
      await this.generateAndSendOtp(
        userId,
        data.phone,
        "alternate_phone",
        verificationType,
      );
    }
    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userId,
      type: "LoanApplicationPersonalInfo",
      brandId: brandId,
      partnerUserId: partnerUserId,
      message: `Alternate phone number ${data.phone} added by partner`,

      platformType: platform_type.PARTNER,

      context: {
        alternatePhoneId: alternatePhoneNumber.id,
        phone: alternatePhoneNumber.phone,
        label: alternatePhoneNumber.label,
        name: alternatePhoneNumber.name,
        relationship: alternatePhoneNumber.relationship,
        verificationType: alternatePhoneNumber.verificationType,
        isVerified: alternatePhoneNumber.isVerified,
      },
    });

    // 5. Return response

    return {
      id: alternatePhoneNumber.id,
      message: isVoiceCall
        ? "Alternate phone number added and verified successfully via voice call."
        : "Alternate phone number added successfully. OTP sent for verification.",
    };
  }

  async verifyAlternatePhoneNumber(
    userId: string,
    alternatePhoneId: string,
    otp: string,
  ) {
    // 1. Validate User
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 2. Find the alternate phone number
    const alternatePhone =
      await this.alternatePhoneNumberService.findOne(alternatePhoneId);

    if (alternatePhone.userId !== userId) {
      throw new BadRequestException(
        "This alternate phone number does not belong to the user",
      );
    }

    if (alternatePhone.isVerified) {
      throw new BadRequestException("Phone number is already verified");
    }

    // 3. Verify OTP
    await this.otpVerificationService.verifyOtp({
      userId,
      otpCode: otp,
      type: "alternate_phone",
    });

    // 4. Mark phone number as verified
    await this.prisma.alternatePhoneNumber.update({
      where: { id: alternatePhoneId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    return {
      message: "Phone number verified successfully",
    };
  }

  async resendAlternatePhoneOtp(userId: string, alternatePhoneId: string) {
    // 1. Validate User
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 2. Find the alternate phone number
    const alternatePhone =
      await this.alternatePhoneNumberService.findOne(alternatePhoneId);

    if (alternatePhone.userId !== userId) {
      throw new BadRequestException(
        "This alternate phone number does not belong to the user",
      );
    }

    if (alternatePhone.isVerified) {
      throw new BadRequestException("Phone number is already verified");
    }

    // 3. Check if voice call verification (no resend needed)
    if (alternatePhone.verificationType === VerificationType.VOICE_CALL) {
      throw new BadRequestException(
        "Voice call verification cannot be resent. Please contact support if needed.",
      );
    }

    // 4. Check OTP limits
    await this.otpVerificationService.checkOtpLimit(userId, "alternate_phone");

    // 5. Generate and send new OTP
    await this.generateAndSendOtp(
      userId,
      alternatePhone.phone,
      "alternate_phone",
      alternatePhone.verificationType || VerificationType.OTP,
    );

    return {
      message: "OTP resent successfully",
    };
  }

  async deleteAlternatePhoneNumber(
    userId: string,
    alternatePhoneId: string,
    partnerUserId: string,
  ) {
    // 1. Validate User
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 2. Find the alternate phone number
    const alternatePhone =
      await this.alternatePhoneNumberService.findOne(alternatePhoneId);

    if (!alternatePhone) {
      throw new NotFoundException(
        `Alternate phone number with ID ${alternatePhoneId} not found`,
      );
    }

    if (alternatePhone.userId !== userId) {
      throw new BadRequestException(
        "This alternate phone number does not belong to the user",
      );
    }

    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userId,
      type: "LoanApplicationPersonalInfo",
      brandId: user.brandId,
      partnerUserId: partnerUserId,
      message: `Alternate phone number ${alternatePhone.phone} deleted by partner`,

      platformType: platform_type.PARTNER,

      context: {
        alternatePhoneId: alternatePhone.id,
        phone: alternatePhone.phone,
        label: alternatePhone.label,
        name: alternatePhone.name,
        relationship: alternatePhone.relationship,
        verificationType: alternatePhone.verificationType,
        isVerified: alternatePhone.isVerified,
      },
    });

    // 3. Delete the alternate phone number
    await this.alternatePhoneNumberService.remove(alternatePhoneId);

    return {
      message: "Alternate phone number deleted successfully",
    };
  }

  private async generateAndSendOtp(
    userId: string,
    phoneNumber: string,
    type: string,
    verificationType: VerificationType = VerificationType.OTP,
  ) {
    // 1. Check OTP limits
    await this.otpVerificationService.checkOtpLimit(userId, type);

    // 2. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Set expiry time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Save OTP to database
    await this.otpVerificationService.createOtp({
      userId,
      otpCode,
      type,
      expiresAt,
    });

    // 5. Send OTP via SMS or Voice Call
    try {
      await this.smsService.sendSms({
        to: phoneNumber,
        text: `Your verification code is: ${otpCode}. This code will expire in 10 minutes.`,
        otp: otpCode,
        name: "Verification Code",
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error?.message ||
        "Failed to send verification. Please try again later.",
      );
    }

    return otpCode;
  }
  // get bsa report
  async getBsaReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ) {
    if (!brandId || !userId || !userBankAccountId || !bankAccountStatementId) {
      throw new BadRequestException(
        "Missing required parameters: brandId, userId, userBankAccountId, and bankAccountStatementId must be provided.",
      );
    }

    const report = await this.bsaReportService.getBsaReport(
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );

    return report;
  }

  // update bank account
  async upsertBankAccount(
    brandId: string,
    userId: string,
    data: UpdateUserBankAccountDto,
    partnerUserId: string,
  ) {
    // 1. Validate User
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const email = user.email;
    if (!email) {
      throw new BadRequestException(
        `User with ID ${userId} does not have a valid email`,
      );
    }

    // 2. Find existing bank account with same details
    const existingAccount = await this.prisma.userBankAccount.findFirst({
      where: {
        userId,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
      },
    });

    // 3. Prevent modification if already verified
    if (
      existingAccount?.verificationStatus ===
      user_bank_verification_status.VERIFIED
    ) {
      throw new BadRequestException(
        `Bank account ${existingAccount.id} is already verified and cannot be modified.`,
      );
    }

    // 4. Check for other verified primary accounts
    const hasVerifiedPrimary = await this.prisma.userBankAccount.findFirst({
      where: {
        userId,
        verificationStatus: user_bank_verification_status.VERIFIED,
        isPrimary: true,
      },
    });

    // 5. Set `isPrimary` flag
    const isPrimary = !hasVerifiedPrimary;

    // 6. Upsert bank account
    const upserted = await this.prisma.userBankAccount.upsert({
      where: existingAccount?.id
        ? { id: existingAccount.id }
        : { id: "invalid-id-placeholder" }, // Required by Prisma
      update: {
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        bankAddress: data.bankAddress,
        verificationStatus: user_bank_verification_status.PENDING,
        verificationMethod: null,
        isPrimary: existingAccount?.isPrimary || isPrimary,
        accountType: data.accountType,
      },
      create: {
        userId,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        bankAddress: data.bankAddress,
        isPrimary,
        accountType: data.accountType,
        verificationStatus: user_bank_verification_status.PENDING,
        verificationMethod: null,
        // verifiedAt: null,
        // isVerified: false,
      },
    });

    // 7. Perform penny drop verification
    try {
      await this.pennyDropService.verifyBankAccountWithFallback(
        brandId,
        {
          accountNumber: data.accountNumber,
          ifsc: data.ifscCode,
          beneficiaryName: data.accountHolderName,
          // email: email,
        },
        userId,
        upserted.id,
      );
    } catch (err) {
      throw new ServiceUnavailableException(
        err.message ||
        "Penny drop verification failed. Please try again later.",
      );
    }

    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userId,
      type: "LoanApplicationBankDetails",
      brandId: brandId,
      partnerUserId: partnerUserId,
      message: `Bank account upserted by partner`,

      platformType: platform_type.PARTNER,

      context: {
        bankAccountId: upserted.id,
        accountNumber: upserted.accountNumber,
        ifscCode: upserted.ifscCode,
        accountHolderName: upserted.accountHolderName,
        bankName: upserted.bankName,
        bankAddress: upserted.bankAddress,
        accountType: upserted.accountType,
        isPrimary: upserted.isPrimary,
        verificationStatus: upserted.verificationStatus,
        verificationMethod: upserted.verificationMethod,
        // isVerified: upserted.isVerified,
      },
    });

    // 8. Mark as verified after penny drop success
    const verifiedAccount = await this.prisma.userBankAccount.update({
      where: { id: upserted.id },
      data: {
        verificationStatus: user_bank_verification_status.VERIFIED,
        verificationMethod: user_bank_verification_method.PENNY_DROP,
        // verifiedAt: new Date(),
        // isVerified: true,
      },
    });

    // 9. Return final verified bank account
    return verifiedAccount;
  }

  // Get all bank accounts for a user
  async getAllBankAccounts(brandId: string, userId: string) {
    try {
      // Validate user exists
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate brand
      if (user.brandId !== brandId) {
        throw new BadRequestException("User does not belong to this brand");
      }

      const bankAccounts = await this.prisma.userBankAccount.findMany({
        where: {
          userId: userId,
        },
        include: {
          BankAccountStatement: {
            select: {
              id: true,
              fromDate: true,
              toDate: true,
              createdAt: true,
            },
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      });

      this.logger.log(
        `Found ${bankAccounts.length} bank accounts for user ${userId}`,
      );
      return bankAccounts;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || "Failed to fetch bank accounts",
      );
    }
  }

  // Get single bank account by ID
  async getBankAccountById(
    brandId: string,
    userId: string,
    bankAccountId: string,
  ) {
    try {
      // Validate user exists
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate brand
      if (user.brandId !== brandId) {
        throw new BadRequestException("User does not belong to this brand");
      }

      const bankAccount = await this.prisma.userBankAccount.findFirst({
        where: {
          id: bankAccountId,
          userId: userId,
        },
        include: {
          BankAccountStatement: true,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException(
          `Bank account with ID ${bankAccountId} not found`,
        );
      }

      return bankAccount;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || "Failed to fetch bank account",
      );
    }
  }

  // Create new bank account
  async createBankAccount(
    brandId: string,
    userId: string,
    data: UpdateUserBankAccountDto,
    partnerUserId: string,
  ) {
    try {
      // Validate user exists
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate brand
      if (user.brandId !== brandId) {
        throw new BadRequestException("User does not belong to this brand");
      }

      // Check if account with same details already exists
      const existingAccount = await this.prisma.userBankAccount.findFirst({
        where: {
          userId,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
        },
      });

      if (existingAccount) {
        throw new BadRequestException(
          "Bank account with same account number and IFSC code already exists",
        );
      }

      // Check if this is the first bank account
      const existingAccountsCount = await this.prisma.userBankAccount.count({
        where: { userId },
      });

      const isPrimary = existingAccountsCount === 0;

      // If setting as primary, unset other accounts
      if (isPrimary) {
        await this.prisma.userBankAccount.updateMany({
          where: {
            userId,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      // Create the bank account
      const newAccount = await this.prisma.userBankAccount.create({
        data: {
          userId,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
          bankAddress: data.bankAddress,
          accountType: data.accountType,
          isPrimary,
          verificationStatus: user_bank_verification_status.PENDING,
          verificationMethod: null,
          // verifiedAt: null,
        },
      });

      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: userId,
        type: "LoanApplicationBankDetails",
        brandId: brandId,
        partnerUserId: partnerUserId,
        message: `Bank account created by partner`,
        platformType: platform_type.PARTNER,

        context: {
          bankAccountId: newAccount.id,
          accountNumber: newAccount.accountNumber,
          ifscCode: newAccount.ifscCode,
          accountHolderName: newAccount.accountHolderName,
          bankName: newAccount.bankName,
          bankAddress: newAccount.bankAddress,
          accountType: newAccount.accountType,
          isPrimary: newAccount.isPrimary,
          verificationStatus: newAccount.verificationStatus,
          verificationMethod: newAccount.verificationMethod,
        },
      });

      this.logger.log(
        `Created new bank account ${newAccount.id} for user ${userId}`,
      );
      return newAccount;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || "Failed to create bank account",
      );
    }
  }

  // Update existing bank account
  async updateBankAccount(
    brandId: string,
    userId: string,
    bankAccountId: string,
    data: UpdateUserBankAccountDto,
    partnerUserId: string,
  ) {
    try {
      // Validate user exists
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate brand
      if (user.brandId !== brandId) {
        throw new BadRequestException("User does not belong to this brand");
      }

      // Check if bank account exists and belongs to user
      const bankAccount = await this.prisma.userBankAccount.findFirst({
        where: {
          id: bankAccountId,
          userId: userId,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException(
          `Bank account with ID ${bankAccountId} not found`,
        );
      }

      // For verified accounts, only allow updating accountHolderName and ifscCode
      const isVerified =
        bankAccount.verificationStatus ===
        user_bank_verification_status.VERIFIED;

      let updatedAccount;
      if (isVerified) {
        // Check if accountHolderName or ifscCode has changed
        const hasChanges =
          bankAccount.accountHolderName !== data.accountHolderName ||
          bankAccount.ifscCode !== data.ifscCode;

        // If accountHolderName changed, calculate updated matching score and name match status
        let updatedPennyDropResponse = bankAccount.pennyDropResponse;
        if (
          hasChanges &&
          data.accountHolderName &&
          bankAccount.pennyDropResponse
        ) {
          const pennyDropModel =
            (bankAccount.pennyDropResponse as any)?.model || {};
          const verifiedName = pennyDropModel.beneficiaryName || "";
          const newName = data.accountHolderName.toUpperCase();

          // Calculate matching score based on name similarity
          const nameMatchScore = this.calculateNameMatchScore(
            verifiedName,
            newName,
          );

          // Update penny drop response with new matching score and name match status
          updatedPennyDropResponse = {
            ...(bankAccount.pennyDropResponse as any),
            model: {
              ...pennyDropModel,
              matchingScore: nameMatchScore,
              isNameMatch: nameMatchScore >= 80, // Consider it a match if score is 80 or higher
            },
          };
        }

        // Update accountHolderName, ifscCode, bankName, and bankAddress for verified accounts
        updatedAccount = await this.prisma.userBankAccount.update({
          where: { id: bankAccountId },
          data: {
            accountHolderName: data.accountHolderName,
            ifscCode: data.ifscCode,
            bankName: data.bankName,
            bankAddress: data.bankAddress,
            pennyDropResponse: updatedPennyDropResponse,
          },
        });
      } else {
        // Update all fields for non-verified accounts
        updatedAccount = await this.prisma.userBankAccount.update({
          where: { id: bankAccountId },
          data: {
            accountNumber: data.accountNumber,
            ifscCode: data.ifscCode,
            accountHolderName: data.accountHolderName,
            bankName: data.bankName,
            bankAddress: data.bankAddress,
            accountType: data.accountType,
          },
        });
      }

      // Refetch the account to get the latest verification status after penny drop
      updatedAccount = await this.prisma.userBankAccount.findUnique({
        where: { id: bankAccountId },
      });

      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: userId,
        type: "LoanApplicationBankDetails",
        brandId: brandId,
        partnerUserId: partnerUserId,
        message: `Bank account updated by partner`,
        platformType: platform_type.PARTNER,

        context: {
          bankAccountId: updatedAccount.id,
          accountNumber: updatedAccount.accountNumber,
          ifscCode: updatedAccount.ifscCode,
          accountHolderName: updatedAccount.accountHolderName,
          bankName: updatedAccount.bankName,
          bankAddress: updatedAccount.bankAddress,
          accountType: updatedAccount.accountType,
          isPrimary: updatedAccount.isPrimary,
          verificationStatus: updatedAccount.verificationStatus,
          verificationMethod: updatedAccount.verificationMethod,
        },
      });

      this.logger.log(
        `Updated bank account ${bankAccountId} for user ${userId}`,
      );
      return updatedAccount;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || "Failed to update bank account",
      );
    }
  }

  // Set primary bank account
  async setPrimaryBankAccount(
    brandId: string,
    userId: string,
    bankAccountId: string,
    partnerUserId: string,
  ) {
    try {
      // Validate user exists
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate brand
      if (user.brandId !== brandId) {
        throw new BadRequestException("User does not belong to this brand");
      }

      // Find the bank account
      const bankAccount = await this.prisma.userBankAccount.findFirst({
        where: {
          id: bankAccountId,
          userId: userId,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException(
          `Bank account with ID ${bankAccountId} not found`,
        );
      }

      // Check if already primary
      if (bankAccount.isPrimary) {
        return bankAccount;
      }

      // Set all other accounts to non-primary
      await this.prisma.userBankAccount.updateMany({
        where: {
          userId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });

      // Set this account as primary
      const updatedAccount = await this.prisma.userBankAccount.update({
        where: { id: bankAccountId },
        data: { isPrimary: true },
      });

      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: userId,
        type: "LoanApplicationBankDetails",
        brandId: brandId,
        partnerUserId: partnerUserId,
        message: `Bank account set as primary by partner`,

        platformType: platform_type.PARTNER,

        context: {
          bankAccountId: updatedAccount.id,
          accountNumber: updatedAccount.accountNumber,
          ifscCode: updatedAccount.ifscCode,
          accountHolderName: updatedAccount.accountHolderName,
          bankName: updatedAccount.bankName,
          isPrimary: updatedAccount.isPrimary,
        },
      });

      this.logger.log(
        `Set bank account ${bankAccountId} as primary for user ${userId}`,
      );
      return updatedAccount;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || "Failed to set primary bank account",
      );
    }
  }

  // Delete bank account
  async deleteBankAccount(
    brandId: string,
    userId: string,
    bankAccountId: string,
    partnerUserId: string,
  ) {
    try {
      // Validate user exists
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate brand
      if (user.brandId !== brandId) {
        throw new BadRequestException("User does not belong to this brand");
      }

      // Find the bank account
      const bankAccount = await this.prisma.userBankAccount.findFirst({
        where: {
          id: bankAccountId,
          userId: userId,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException(
          `Bank account with ID ${bankAccountId} not found`,
        );
      }

      // Prevent deletion of verified primary account if there are other accounts
      if (bankAccount.isPrimary) {
        const otherAccounts = await this.prisma.userBankAccount.count({
          where: {
            userId,
            id: { not: bankAccountId },
          },
        });

        if (otherAccounts > 0) {
          throw new BadRequestException(
            "Cannot delete primary bank account. Please set another account as primary first.",
          );
        }
      }

      // Delete associated bank statements first
      await this.prisma.bankAccountStatement.deleteMany({
        where: { userBankAccountId: bankAccountId },
      });

      // Delete the bank account
      await this.prisma.userBankAccount.delete({
        where: { id: bankAccountId },
      });

      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: userId,
        type: "LoanApplicationBankDetails",
        brandId: brandId,
        partnerUserId: partnerUserId,
        message: `Bank account deleted by partner`,

        platformType: platform_type.PARTNER,

        context: {
          bankAccountId: bankAccount.id,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          accountHolderName: bankAccount.accountHolderName,
          bankName: bankAccount.bankName,
          isPrimary: bankAccount.isPrimary,
        },
      });

      this.logger.log(
        `Deleted bank account ${bankAccountId} for user ${userId}`,
      );

      return {
        success: true,
        message: "Bank account deleted successfully",
        deletedAccountId: bankAccountId,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || "Failed to delete bank account",
      );
    }
  }

  async createBankStatement(
    partnerUserId: string,
    data: CreateBankAccountStatementDto & { file: Express.Multer.File },
  ) {
    const {
      file,
      userId,
      userBankAccountId,
      brandId,
      fromDate,
      toDate,
      filePassword,
    } = data;

    if (!file) {
      throw new BadRequestException("Bank statement file is required.");
    }

    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException("Only PDF files are allowed.");
    }

    let uploadedFile;
    try {
      uploadedFile = await this.awsS3Service.uploadPrivateDocument(
        file,
        brandId,
        userId,
        "bank-statement",
      );
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to upload file to S3.",
        error.message,
      );
    }

    if (!uploadedFile?.key) {
      throw new InternalServerErrorException(
        "File upload failed: missing file key.",
      );
    }

    let statement;
    try {
      statement = await this.bankAccountStatementService.create({
        userId,
        userBankAccountId,
        filePrivateKey: uploadedFile.key,
        fromDate,
        toDate,
        filePassword: filePassword || null,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to create bank account statement.",
        error.message,
      );
    }

    try {
      await this.bsaReportService.uploadBsaReport(
        brandId,
        userId,
        userBankAccountId,
        statement.id,
        file,
      );
    } catch (error) {
      this.logger.error(
        `BSA Report upload failed: ${error.message}`,
        error.stack,
      );
      // Optionally: mark statement as failed or handle retry logic here
    }

    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userId,
      type: "LoanApplicationBankDetails",
      brandId: brandId,
      partnerUserId: partnerUserId,
      message: `Bank statement uploaded by partner`,

      platformType: platform_type.PARTNER,

      context: {
        statementId: statement.id,
        userBankAccountId: statement.userBankAccountId,
        filePrivateKey: statement.filePrivateKey,
        fromDate: statement.fromDate,
        toDate: statement.toDate,
        hasPassword: !!filePassword,
      },
    });

    return statement;
  }

  async addVerifiedDocument(
    userId: string,
    brandId: string,
    partnerUserId: string,
    data: CreateVerifiedDocumentUploadDto,
    files: Express.Multer.File[],
  ) {
    const {
      documentType,
      documentNumber,
      verificationNotes,
      frontPassword,
      backPassword,
    } = data;

    // Step 1: Validate input
    if (!userId) {
      throw new BadRequestException("User ID is required.");
    }

    if (!files || files.length !== 2) {
      throw new BadRequestException(
        "Exactly 2 files (front and back) are required.",
      );
    }

    const [frontFile, backFile] = files;

    // Step 2: Fetch user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { brand: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    let frontUploadKey: string;
    let backUploadKey: string;

    // Step 3: Upload to S3
    try {
      const frontUpload = await this.awsS3Service.uploadPrivateDocument(
        frontFile,
        user.brandId,
        user.id,
        "documents",
      );
      frontUploadKey = frontUpload.key;

      const backUpload = await this.awsS3Service.uploadPrivateDocument(
        backFile,
        user.brandId,
        user.id,
        "documents",
      );
      backUploadKey = backUpload.key;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || "Document upload failed. Please try again.",
      );
    }

    // Step 4: Check for existing document of same type
    const existingDoc = await this.documentsService.getDocumentByType(
      userId,
      documentType,
    );

    if (existingDoc) {
      const updatedDoc = await this.documentsService.update(
        existingDoc.id,
        userId,
        {
          frontDocumentUrl: frontUploadKey,
          backDocumentUrl: backUploadKey,
          documentNumber,
          isApprovedByAdmin: true,
          status: document_status_enum.APPROVED,

          verificationNotes: verificationNotes || null,
          frontPassword: frontPassword || null,
          backPassword: backPassword || null,
        },
      );

      return updatedDoc;
    }

    // Step 5: Create new document entry
    try {
      const createdDoc = await this.prisma.document.create({
        data: {
          userId,
          type: documentType,
          documentNumber,
          frontDocumentUrl: frontUploadKey,
          backDocumentUrl: backUploadKey,
          status: document_status_enum.APPROVED,
          isApprovedByAdmin: true,
          verificationNotes: verificationNotes || null,
          frontPassword: frontPassword || null,
          backPassword: backPassword || null,
        },
      });
      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: userId,
        type: "LoanApplicationPersonalInfo",
        brandId: user.brandId,
        partnerUserId: partnerUserId,
        message: `Document of type ${documentType} added by partner`,

        platformType: platform_type.PARTNER,

        context: {
          documentId: createdDoc.id,
          documentType: createdDoc.type,
          documentNumber: createdDoc.documentNumber,
          frontDocumentUrl: createdDoc.frontDocumentUrl,
          backDocumentUrl: createdDoc.backDocumentUrl,
          status: createdDoc.status,
          isApprovedByAdmin: createdDoc.isApprovedByAdmin,
          verificationNotes: createdDoc.verificationNotes,
        },
      });
      this.logger.log(
        `Created new document ${createdDoc.id} for user ${userId}`,
      );

      return createdDoc;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || "Failed to save document.",
      );
    }
  }

  async upsertOtherDocument(
    userId: string,
    brandId: string,
    partnerUserId: string,
    data: UpsertDocumentUploadDto,
    files: Express.Multer.File[],
  ) {
    const {
      documentType,
      documentNumber,
      verificationNotes,
      frontPassword,
      backPassword,
    } = data;

    // Step 1: Validate input
    if (!userId) {
      throw new BadRequestException("User ID is required.");
    }

    // Step 2: Fetch user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { brand: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const isEditMode = !!data.id;
    let frontUploadKey: string | undefined;
    let backUploadKey: string | undefined;

    // Step 3: Handle file uploads
    // For new documents, require both files
    // For updates, files are optional
    if (!isEditMode && (!files || files.length < 1)) {
      throw new BadRequestException(
        "At least 1 file (front) is required for new documents..",
      );
    }

    // Check if we have valid files to upload
    const validFiles =
      files?.filter(
        (file) => file && file.size > 0 && file.originalname !== "empty",
      ) || [];

    if (validFiles.length > 0) {
      if (validFiles.length < 1) {
        throw new BadRequestException(
          "If uploading files, exactly 2 files (front and back) are required.",
        );
      }

      const [frontFile, backFile] = validFiles;

      // Upload to S3
      try {
        let frontUpload = null;
        if (frontFile) {
          frontUpload = await this.awsS3Service.uploadPrivateDocument(
            frontFile,
            user.brandId,
            user.id,
            "documents",
          );
          frontUploadKey = frontUpload.key;
        }
        let backUpload = null;
        if (backFile) {
          backUpload = await this.awsS3Service.uploadPrivateDocument(
            backFile,
            user.brandId,
            user.id,
            "documents",
          );
          backUploadKey = backUpload.key;
        }
      } catch (error) {
        throw new InternalServerErrorException(
          error.message || "Document upload failed. Please try again.",
        );
      }
    }

    // Step 4: Prepare upsert data
    const baseData = {
      type: documentType,
      documentNumber,
      status: document_status_enum.APPROVED,
      isApprovedByAdmin: true,
      verificationNotes: verificationNotes || null,
      frontPassword: frontPassword || null,
      backPassword: backPassword || null,
    };

    // Add file URLs only if new files were uploaded
    const updateData = {
      ...baseData,
      ...(frontUploadKey && { frontDocumentUrl: frontUploadKey }),
      ...(backUploadKey && { backDocumentUrl: backUploadKey }),
    };

    // For create mode, we need to ensure we have file URLs
    // If it's not edit mode and we don't have upload keys, something went wrong
    if (!isEditMode && !frontUploadKey) {
      throw new BadRequestException(
        "File upload failed. Front document is required for new documents.",
      );
    }

    const createData = {
      id: uuidv4(),
      userId,
      ...baseData,
      // Always include file URLs, use empty string if not provided (for new documents this should never happen due to validation above)
      frontDocumentUrl: frontUploadKey || "",
      backDocumentUrl: backUploadKey || "",
    };

    const upsert = await this.prisma.otherDocument.upsert({
      where: {
        id: data?.id || "",
      },
      create: createData,
      update: updateData,
    });

    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userId,
      type: "LoanApplicationPersonalInfo",
      brandId: user.brandId,
      partnerUserId: partnerUserId,
      message: `Other document ${upsert.id} of type ${documentType} ${isEditMode ? "updated" : "added"} by partner`,

      platformType: platform_type.PARTNER,

      context: {
        documentId: upsert.id,
        documentType: upsert.type,
        documentNumber: upsert.documentNumber,
        frontDocumentUrl: upsert.frontDocumentUrl,
        backDocumentUrl: upsert.backDocumentUrl,
        status: upsert.status,
        isApprovedByAdmin: upsert.isApprovedByAdmin,
        verificationNotes: upsert.verificationNotes,
      },
    });

    return upsert;
  }

  async updateDocumentNumber(
    userId: string,
    brandId: string,
    partnerUserId: string,
    dto: UpdateDocumentNumberDto,
  ) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find the document to update
    const document = await this.prisma.document.findFirst({
      where: {
        userId: userId,
        type: dto.documentType,
        status: {
          in: [document_status_enum.APPROVED],
        },
      },
    });

    if (!document) {
      throw new NotFoundException(
        `No approved ${dto.documentType} document found for user`,
      );
    }

    // Update the document number
    const updatedDocument = await this.prisma.document.update({
      where: { id: document.id },
      data: {
        documentNumber: dto.documentNumber,
        isApprovedByAdmin: true,
        status: document_status_enum.APPROVED,
      },
    });

    // Log the activity
    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userId,
      type: "LoanApplicationPersonalInfo",
      brandId: brandId,
      partnerUserId: partnerUserId,
      message: `Document number updated for ${dto.documentType} document by partner`,

      platformType: platform_type.PARTNER,

      context: {
        documentId: document.id,
        documentType: dto.documentType,
        oldDocumentNumber: document.documentNumber,
        newDocumentNumber: dto.documentNumber,
      },
    });

    return {
      success: true,
      message: "Document number updated successfully",
      document: updatedDocument,
    };
  }

  async getUserAddresses(userId: string) {
    try {
      // Validate user exists
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Fetch all required data in parallel for better performance
      const [user, addresses, documents, equifax, userGeoTags] =
        await Promise.all([
          this.getUserDetails(userId),
          this.prisma.alternateAddress.findMany({
            where: {
              userId: userId,
              isActive: true,
              isDisabled: false,
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          this.prisma.document.findMany({
            where: {
              userId: userId,
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          this.prisma.equifaxSomeTable.findFirst({
            where: {
              userId: userId,
            },
          }),
          this.prisma.userGeoTag.findMany({
            where: {
              userId: userId,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1, // Get last 5 geo locations
          }),
        ]);

      // Process BRE (Credit Report) addresses from Equifax
      const addressesFromEquifax = [];
      const equifaxAddress: any = equifax?.braReportJson || {};

      if (equifaxAddress?.CCRResponse?.CIRReportDataLst) {
        equifaxAddress.CCRResponse.CIRReportDataLst.forEach((report) => {
          // From CIRReportData > IDAndContactInfo > AddressInfo
          report?.CIRReportData?.IDAndContactInfo?.AddressInfo?.forEach(
            (addr) => {
              const formatted = [addr.Address, addr.State, addr.Postal]
                .filter(Boolean)
                .join(", ")
                .trim();

              if (formatted) {
                addressesFromEquifax.push({
                  type: addr.Type || "Credit Report Address",
                  address: formatted,
                  createdAt: equifax.createdAt || null,
                  remarks: "From Equifax Credit Report",
                });
              }
            },
          );

          // From InquiryRequestInfo > InquiryAddresses
          report?.InquiryRequestInfo?.InquiryAddresses?.forEach((addr) => {
            const formatted = [addr.AddressLine1, addr.State, addr.Postal]
              .filter(Boolean)
              .join(", ")
              .trim();

            if (formatted) {
              addressesFromEquifax.push({
                type: addr.AddressType?.join(", ") || "Credit Report Address",
                address: formatted,
                createdAt: equifax.createdAt || null,
                remarks: "From Equifax Inquiry",
              });
            }
          });
        });
      }

      // From top-level InquiryRequestInfo > InquiryAddresses
      equifaxAddress?.InquiryRequestInfo?.InquiryAddresses?.forEach((addr) => {
        const formatted = [addr.AddressLine1, addr.State, addr.Postal]
          .filter(Boolean)
          .join(", ")
          .trim();

        if (formatted) {
          addressesFromEquifax.push({
            type: addr.AddressType?.join(", ") || "Credit Report Address",
            address: formatted,
            createdAt: equifax?.createdAt || null,
            remarks: "From Equifax Inquiry (Top Level)",
          });
        }
      });

      // Process Document addresses
      const documentAddress = [];
      documents.forEach((doc) => {
        const address: any = doc?.providerData || {};
        if (!address?.addressDetails) return;

        const addr = address.addressDetails;
        const formattedAddress = [
          addr.house,
          addr.street || addr.street_name,
          addr.landmark,
          addr.locality || addr.vtc || addr.po,
          addr.subdist,
          addr.dist || addr.city,
          addr.state,
          addr.pincode || addr.pc,
          addr.country,
        ]
          .filter(Boolean)
          .join(", ")
          .trim();

        if (formattedAddress) {
          documentAddress.push({
            type: doc.type,
            address: formattedAddress,
            createdAt: doc.createdAt,
            remarks:
              doc.verificationNotes || `Extracted from ${doc.type} document`,
          });
        }
      });

      // Process Alternate addresses
      const alternateAddresses = addresses.map((address) => {
        const formattedAddress = [
          address.address,
          address.city,
          address.state,
          address.pincode,
          address.country,
        ]
          .filter(Boolean)
          .join(", ")
          .trim();

        return {
          type: address.addressProofType,
          address: formattedAddress,
          createdAt: address.createdAt,
          remarks: address.remarks || "",
        };
      });

      // Process Geo Location addresses
      const geoAddresses = userGeoTags.map((geoTag) => {
        const formattedAddress = [
          geoTag.address,
          geoTag.street,
          geoTag.sublocality,
          geoTag.city,
          geoTag.district,
          geoTag.state,
          geoTag.postalCode,
          geoTag.country,
        ]
          .filter(Boolean)
          .join(", ")
          .trim();

        return {
          type: "Geo Location",
          address:
            formattedAddress ||
            geoTag.address ||
            `${geoTag.latitude}, ${geoTag.longitude}`,
          createdAt: geoTag.createdAt,
          remarks: geoTag.notes || "Captured via geolocation",
        };
      });

      // Format PAN/Permanent address
      const permanentAddress = [
        user?.address,
        user?.city,
        user?.state,
        user?.pincode,
      ]
        .filter(Boolean)
        .join(", ")
        .trim();

      return {
        user: permanentAddress || null,
        documentAddress: documentAddress,
        bre: addressesFromEquifax,
        alternateAddresses: alternateAddresses,
        geoAddresses: geoAddresses,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || "Failed to fetch user addresses",
      );
    }
  }

  async upsertAlternateAddress(
    userId: string,
    branchId: string,
    partnerUserId: string,
    data: {
      id?: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
      addressProofType: AddressProofEnum;
      filePrivateKey?: string;
      isActive?: boolean;
      isDisabled?: boolean;
      remarks?: string;
    },
  ) {
    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate required fields
      if (
        !data.address ||
        !data.city ||
        !data.state ||
        !data.pincode ||
        !data.country
      ) {
        throw new BadRequestException(
          "All address fields (address, city, state, pincode, country) are required",
        );
      }

      // Validate pincode format (6 digits for India)
      if (data.country === "India" && !/^\d{6}$/.test(data.pincode)) {
        throw new BadRequestException(
          "Invalid pincode format. Must be 6 digits for India",
        );
      }

      const addressData = {
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        pincode: data.pincode.trim(),
        country: data.country.trim(),
        addressProofType: data.addressProofType,
        filePrivateKey: data.filePrivateKey || null,
        isActive: data.isActive ?? true,
        isDisabled: data.isDisabled ?? false,
        remarks: data.remarks?.trim() || null,
      };

      if (data.id) {
        // Check if the address exists and belongs to the user
        const existingAddress = await this.prisma.alternateAddress.findFirst({
          where: {
            id: data.id,
            userId: userId,
          },
        });

        if (!existingAddress) {
          throw new NotFoundException(
            `Address with ID ${data.id} not found or does not belong to this user`,
          );
        }

        // Update existing address
        const updated = await this.prisma.alternateAddress.update({
          where: { id: data.id },
          data: {
            ...addressData,
            updatedAt: new Date(),
          },
        });

        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user.brandId,
          partnerUserId: partnerUserId,
          message: `Alternate address updated by partner`,

          platformType: platform_type.PARTNER,

          context: {
            addressId: updated.id,
            address: updated.address,
            city: updated.city,
            state: updated.state,
            pincode: updated.pincode,
            country: updated.country,
            addressProofType: updated.addressProofType,
            remarks: updated.remarks,
            isActive: updated.isActive,
          },
        });

        this.logger.log(
          `Updated alternate address ${data.id} for user ${userId}`,
        );

        return {
          success: true,
          message: "Address updated successfully",
          data: updated,
        };
      } else {
        // Create new address
        const created = await this.prisma.alternateAddress.create({
          data: {
            id: uuidv4(),
            userId,
            ...addressData,
            createdAt: new Date(),
          },
        });

        await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: userId,
          type: "LoanApplicationPersonalInfo",
          brandId: user.brandId,
          partnerUserId: partnerUserId,
          message: `Alternate address created by partner`,

          platformType: platform_type.PARTNER,

          context: {
            addressId: created.id,
            address: created.address,
            city: created.city,
            state: created.state,
            pincode: created.pincode,
            country: created.country,
            addressProofType: created.addressProofType,
            remarks: created.remarks,
            isActive: created.isActive,
          },
        });

        this.logger.log(
          `Created new alternate address ${created.id} for user ${userId}`,
        );

        return {
          success: true,
          message: "Address added successfully",
          data: created,
        };
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || "Failed to save address",
      );
    }
  }

  //aadhaar
  async getAadhaarLink(userId: string, brandId: string, partnerUserId: string) {
    const digiLocker20 = await this.digiLocker20Service.generateUrlWithFallback(
      {
        userId,
        brandId,
      },
    );
    return digiLocker20;
  }
  async getRecentDigiLockerUrls(userId: string, brandId: string) {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const recentLogs = await this.prisma.aadhaar_digi_locker_log.findMany({
        where: {
          userId,
          brandId,
          status: "SUCCESS",
          createdAt: {
            gte: fifteenMinutesAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 2,
        select: {
          id: true,
          provider: true,
          response: true,
          createdAt: true,
          digiLockerId: true,
        },
      });

      const formattedUrls = recentLogs.map((log) => {
        const resp = log.response as any;

        // extract url safely from both formats
        const url =
          resp?.url ||
          resp?.result?.url ||
          resp?.model?.url ||
          resp?.result?.model?.url ||
          "";

        const isValid = !!url;

        return {
          id: log.id,
          url,
          provider: log.provider,
          createdAt: log.createdAt,
          digiLockerId: log.digiLockerId,
          isValid,
        };
      });

      return {
        success: true,
        urls: formattedUrls,
        hasValidUrls: formattedUrls.some((u) => u.isValid),
      };
    } catch (error: any) {
      console.error("Error fetching recent DigiLocker URLs:", error);
      return {
        success: false,
        urls: [],
        hasValidUrls: false,
        error: error.message,
      };
    }
  }

  async getManualVerificationDetails(
    userId: string,
    brandId: string,
  ): Promise<{
    firstName?: string;
    middleName?: string;
    lastName?: string;
    address?: string;
    state?: string;
    pincode?: string;
    city?: string;
    mobileNumber?: string;
    panNumber?: string;
    dateOfBirth?: string;
  }> {
    const [user, userDetails, documents] = await Promise.all([
      this.usersService.findOne(userId),
      this.userDetailsService.findOneByUser(userId),
      this.documentsService.getDocumentByType(userId, DocumentTypeEnum.PAN),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!userDetails) {
      throw new NotFoundException(`User details for ID ${userId} not found`);
    }

    const panNumber = documents?.[0]?.documentNumber || "";
    const mobileNumber = user.phoneNumber.startsWith("+91")
      ? user.phoneNumber.substring(3)
      : user.phoneNumber;

    //  get state code
    const indianStatesWithCapital = IndianStatesWithCapitals.find(
      (state) => state.value === user?.userDetails?.state,
    );
    return {
      firstName: userDetails.firstName || "",
      middleName: userDetails.middleName || "",
      lastName: userDetails.lastName || "",
      address: userDetails.address || "",
      state: indianStatesWithCapital?.code || null,
      pincode: userDetails.pincode || "",
      city: userDetails.city || "",
      mobileNumber: mobileNumber || "",
      panNumber,
      dateOfBirth: userDetails.dateOfBirth
        ? _dayjs(userDetails.dateOfBirth).format("YYYY-MM-DD")
        : "",
    };
  }

  // update onboarding_journey
  async updateUserReloan(
    id: string,
    status: ReloanStatus,
    partnerUserId: string,

    reason?: string,
  ) {
    const userReloan = await this.prisma.userReloan.findUnique({
      where: { id },
    });

    if (!userReloan) {
      throw new NotFoundException(`User reloan with ID ${id} not found`);
    }
    const reloan = await this.prisma.userReloan.update({
      where: { id },
      data: {
        status,
        reason: reason || null,
        isResolved: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userReloan.userId },
    });

    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: userReloan.userId,
      type: "LoanApplicationPersonalInfo",
      brandId: user.brandId,
      partnerUserId: partnerUserId,
      message: `User reloan status updated to ${status} by partner`,

      platformType: platform_type.PARTNER,

      context: {
        reloanId: reloan.id,
        previousStatus: userReloan.status,
        newStatus: status,
        reason: reason,
        isResolved: reloan.isResolved,
      },
    });

    return reloan;
  }

  async uploadProfileMedia(
    userId: string,
    brandId: string,
    partnerUserId: string,
    files: Express.Multer.File[],
  ) {
    this.logger.log(
      `Starting upload for user ${userId}, received ${files?.length || 0} files`,
    );

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided for upload");
    }

    let profilePicUrl: string | null = null;
    let profileVideoUrl: string | null = null;

    try {
      // Process uploaded files
      for (const file of files) {
        // this.logger.log(
        //   `Processing file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size}`
        // );

        if (file.mimetype.startsWith("image/")) {
          // this.logger.log("Uploading profile picture to S3");
          // Upload profile picture using existing method
          const uploadResult = await this.awsS3Service.uploadPublicFile(
            file,
            brandId,
            userId,
            "user_profile",
          );
          profilePicUrl = uploadResult;
          this.logger.log(
            `Profile picture uploaded successfully: ${profilePicUrl}`,
          );
        } else if (file.mimetype.startsWith("video/")) {
          this.logger.log("Uploading profile video to S3");
          // Upload profile video using existing method
          const uploadResult = await this.awsS3Service.uploadPublicFile(
            file,
            brandId,
            userId,
            "user_profile",
          );
          profileVideoUrl = uploadResult;
          this.logger.log(
            `Profile video uploaded successfully: ${profileVideoUrl}`,
          );
        } else {
          this.logger.warn(`Unsupported file type: ${file.mimetype}`);
        }
      }

      // Update user's profile media URLs directly in UserDetails
      const updateData: {
        profilePicUrl?: string;
        profileVideoUrl?: string;
      } = {};
      if (profilePicUrl) {
        updateData.profilePicUrl = profilePicUrl;
      }
      if (profileVideoUrl) {
        updateData.profileVideoUrl = profileVideoUrl;
      }
      if (Object.keys(updateData).length > 0) {
        this.logger.log(
          `Updating user details with: ${JSON.stringify(updateData)}`,
        );
        await this.prisma.userDetails.update({
          where: { userId },
          data: updateData,
        });
        this.logger.log("User details updated successfully");
      }

      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: userId,
        type: "LoanApplicationPersonalInfo",
        brandId: brandId,
        partnerUserId: partnerUserId,
        message: `Profile media uploaded by partner`,

        platformType: platform_type.PARTNER,

        context: {
          profilePicUrl: profilePicUrl,
          profileVideoUrl: profileVideoUrl,
          filesCount: files.length,
        },
      });

      const result = {
        success: true,
        message: "Profile media uploaded successfully",
        data: {
          profilePicUrl: profilePicUrl,
          profileVideoUrl: profileVideoUrl,
        },
      };

      this.logger.log(
        `Upload completed successfully: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || "Failed to upload profile media",
      );
    }
  }

  // async skipOnboardingStep(
  //   userId: string,
  //   brandId: string,
  //   partnerUserId: string,
  //   stepNumber: number,
  //   reason: string,
  // ) {
  //   try {
  //     this.logger.log(
  //       `Skipping onboarding step ${stepNumber} for user ${userId} in brand ${brandId}`,
  //     );

  //     // First, check if the user exists
  //     const user = await this.prisma.user.findUnique({
  //       where: { id: userId },
  //       include: {
  //         onboardingJourneys: true,
  //       },
  //     });

  //     if (!user) {
  //       throw new NotFoundException("User not found");
  //     }

  //     // Check if the step has already been completed
  //     const existingJourney = user.onboardingJourneys.find(
  //       (journey) => journey.stepNumber === stepNumber,
  //     );

  //     if (existingJourney) {
  //       throw new BadRequestException(
  //         `Step ${stepNumber} has already been completed`,
  //       );
  //     }

  //     // Validate step number
  //     if (stepNumber < 1 || stepNumber > 12) {
  //       throw new BadRequestException("Step number must be between 1 and 12");
  //     }

  //     // Update user's onboarding step if the current step is less than the step being skipped
  //     const currentStep = user.onboardingStep || 0;
  //     if (currentStep < stepNumber) {
  //       await this.prisma.user.update({
  //         where: { id: userId },
  //         data: { onboardingStep: stepNumber },
  //       });
  //       this.logger.log(
  //         `Updated user onboarding step from ${currentStep} to ${stepNumber}`,
  //       );
  //     }
  //     const onboardingJourney = await this.prisma.onboardingJourney.upsert({
  //       where: {
  //         userId_stepNumber: {
  //           userId,
  //           stepNumber,
  //         },
  //       },
  //       update: {
  //         reason,
  //         updatedAt: new Date(),
  //         partnerUserId,
  //       },
  //       create: {
  //         userId,
  //         brandId,
  //         stepNumber,
  //         reason,
  //         partnerUserId,
  //         createdAt: new Date(),
  //       },
  //     });
  //     this.logger.log(
  //       `Created onboarding journey entry for step ${stepNumber}: ${onboardingJourney.id}`,
  //     );

  //     await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
  //       userId: userId,
  //       type: "LoanApplicationPersonalInfo",
  //       brandId: brandId,
  //       partnerUserId: partnerUserId,
  //       message: `Onboarding step ${stepNumber} skipped by partner`,

  //       platformType: platform_type.PARTNER,

  //       context: {
  //         stepNumber: stepNumber,
  //         reason: reason,
  //         onboardingJourneyId: onboardingJourney.id,
  //         previousStep: currentStep,
  //       },
  //     });

  //     return {
  //       success: true,
  //       message: `Onboarding step ${stepNumber} skipped successfully`,
  //       data: {
  //         stepNumber,
  //         reason,
  //         onboardingJourneyId: onboardingJourney.id,
  //         previousStep: currentStep,
  //         newStep: stepNumber,
  //       },
  //     };
  //   } catch (error) {
  //     if (
  //       error instanceof NotFoundException ||
  //       error instanceof BadRequestException
  //     ) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException(
  //       error.message || "Failed to skip onboarding step",
  //     );
  //   }
  // }

  async saveUserStatusBrandReasons(
    userId: string,
    brandId: string,
    partnerUserId: string,
    brandStatusReasonIds: string[],
    status_id: bigint,
  ) {
    try {
      // Validate that the user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Check if user has loans in statuses that prevent rejection
      if (
        Number(status_id) === UserStatusEnum.BLOCKED ||
        Number(status_id) === UserStatusEnum.SUSPENDED
      ) {
        const blockingLoanStatuses = await this.prisma.loan.findMany({
          where: {
            userId: userId,
            status: {
              in: [
                loan_status_enum.APPROVED,
                loan_status_enum.DISBURSED,
                loan_status_enum.ACTIVE,
                loan_status_enum.PARTIALLY_PAID,
                loan_status_enum.PAID,
                loan_status_enum.COMPLETED,
                loan_status_enum.POST_ACTIVE,
                loan_status_enum.SANCTION_MANAGER_APPROVED,
              ],
            },
          },
          select: {
            id: true,
            status: true,
            formattedLoanId: true,
          },
        });

        if (blockingLoanStatuses.length > 0) {
          const loanDetails = blockingLoanStatuses
            .map(
              (loan) =>
                `Loan ${loan.formattedLoanId || loan.id} (Status: ${loan.status})`,
            )
            .join(", ");

          throw new BadRequestException(
            `User cannot be rejected because they have active or approved loans: ${loanDetails}`,
          );
        }
      }

      // Get brand config to check userrejection setting
      const brandConfig = await this.prisma.brandConfig.findUnique({
        where: { brandId: brandId },
        select: { user_rejection_type: true },
      });

      const userRejectionType = brandConfig?.user_rejection_type;

      // If status is PENDING, ACTIVE, ON_HOLD, or SUSPENDED and no reasons provided, just update status
      if (
        (Number(status_id) === UserStatusEnum.PENDING ||
          Number(status_id) === UserStatusEnum.ACTIVE ||
          Number(status_id) === UserStatusEnum.ON_HOLD ||
          Number(status_id) === UserStatusEnum.SUSPENDED) &&
        brandStatusReasonIds.length === 0
      ) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            status_id: status_id,
          },
        });

        return {
          success: true,
          message: "User status updated successfully",
          data: {
            userId,
            brandId,
            status_id: status_id.toString(),
            brandStatusReasonIds: [],
            count: 0,
          },
        };
      }

      // Map status_id to status string for query
      let statusString: brand_status_enum = "PENDING";
      if (Number(status_id) === UserStatusEnum.BLOCKED) {
        statusString = "REJECTED";
      } else if (Number(status_id) === UserStatusEnum.SUSPENDED) {
        statusString = "REJECTED";
      } else if (Number(status_id) === UserStatusEnum.ON_HOLD) {
        statusString = "HOLD";
      } else if (Number(status_id) === UserStatusEnum.ACTIVE) {
        statusString = "ACTIVE";
      } else {
        throw new BadRequestException("Invalid status_id provided");
      }

      const brandReasons = await this.prisma.brand_status_reasons.findMany({
        where: {
          id: { in: brandStatusReasonIds },
          brandId,
          type: "USER",
          status: statusString,
          isActive: true,
        },
      });

      console.log(
        "Fetched brand reasons:",
        brandReasons,
        "for reason IDs:",
        brandStatusReasonIds,
      );
      if (brandReasons.length !== brandStatusReasonIds.length) {
        throw new BadRequestException(
          "Some brand status reasons are invalid or don't belong to this brand",
        );
      }

      const userStatusBrandReasons =
        await this.prisma.user_status_brand_reasons.createMany({
          data: brandStatusReasonIds.map((brandStatusReasonId) => ({
            id: uuidv4(),
            userId,
            brandStatusReasonId,
          })),
        });

      // Update user status_id directly (already BigInt format)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status_id: status_id,
        },
      });

      let rejectedLoansCount = 0;
      if (
        userRejectionType === "WITH_LOAN" &&
        (Number(status_id) === UserStatusEnum.BLOCKED ||
          Number(status_id) === UserStatusEnum.SUSPENDED)
      ) {
        // Find all pending and credit executive approved loans for this user
        const loansToReject = await this.prisma.loan.findMany({
          where: {
            userId: userId,
            status: {
              in: [
                loan_status_enum.PENDING,
                loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
              ],
            },
          },
          select: {
            id: true,
            status: true,
            formattedLoanId: true,
          },
        });

        // Reject each loan
        for (const loan of loansToReject) {
          try {
            // Update loan status to REJECTED
            await this.prisma.loan.update({
              where: { id: loan.id },
              data: {
                status: loan_status_enum.REJECTED,
                updatedAt: new Date(),
              },
            });

            // Create loan status history entry
            const loanStatusHistory =
              await this.prisma.loanStatusHistory.create({
                data: {
                  id: uuidv4(),
                  loanId: loan.id,
                  status: loan_status_enum.REJECTED,
                  message: `Loan auto-rejected due to user rejection (${userRejectionType})`,
                  partnerUserId: partnerUserId,
                  createdAt: new Date(),
                },
              });

            // Link loan status reasons from user rejection
            if (brandStatusReasonIds.length > 0) {
              const loanStatusBrandReasonsData = brandStatusReasonIds.map(
                (reasonId) => ({
                  id: uuidv4(),
                  loanStatusHistoryId: loanStatusHistory.id,
                  brandStatusReasonId: reasonId,
                }),
              );

              await this.prisma.loan_status_brand_reasons.createMany({
                data: loanStatusBrandReasonsData,
              });
            }

            rejectedLoansCount++;
          } catch (loanError) {
            console.error(`Error rejecting loan ${loan.id}:`, loanError);
            // Continue with other loans even if one fails
          }
        }
      }

      // Map status_id back to string for audit log message
      let statusNameForLog = "PENDING";
      if (Number(status_id) === UserStatusEnum.BLOCKED) {
        statusNameForLog = "REJECTED";
      } else if (Number(status_id) === UserStatusEnum.SUSPENDED) {
        statusNameForLog = "SUSPENDED";
      } else if (Number(status_id) === UserStatusEnum.ON_HOLD) {
        statusNameForLog = "ON_HOLD";
      } else if (Number(status_id) === UserStatusEnum.ACTIVE) {
        statusNameForLog = "ACTIVE";
      }

      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: userId,
        type: "LoanApplicationPersonalInfo",
        brandId: brandId,
        partnerUserId: partnerUserId,
        message: `User status updated to ${statusNameForLog} by partner`,
        platformType: platform_type.PARTNER,
        context: {
          newStatus: statusNameForLog,
          brandStatusReasonIds: brandStatusReasonIds,
          reasonsCount: userStatusBrandReasons.count,
          userRejectionType: userRejectionType,
          rejectedLoansCount: rejectedLoansCount,
          pendingLoansRejected:
            userRejectionType === "WITH_LOAN" &&
            (Number(status_id) === UserStatusEnum.BLOCKED ||
              Number(status_id) === UserStatusEnum.SUSPENDED),
        },
      });

      return {
        success: true,
        message:
          userRejectionType === "WITH_LOAN" &&
            (Number(status_id) === UserStatusEnum.BLOCKED ||
              Number(status_id) === UserStatusEnum.SUSPENDED)
            ? `User status updated and ${rejectedLoansCount} loans rejected successfully`
            : "User status and reasons updated successfully",
        data: {
          userId,
          brandId,
          status_id: status_id.toString(),
          brandStatusReasonIds,
          count: userStatusBrandReasons.count,
          userRejectionType,
          rejectedLoansCount:
            userRejectionType === "WITH_LOAN" &&
              (Number(status_id) === UserStatusEnum.BLOCKED ||
                Number(status_id) === UserStatusEnum.SUSPENDED)
              ? rejectedLoansCount
              : 0,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error?.message || "Failed to save user status brand reasons",
      );
    }
  }

  // ==================== User Salaries Management ====================

  async getUserSalaries(userId: string) {
    return this.userSalaryService.getUserSalaries(userId);
  }

  async createUserSalary(
    userId: string,
    partnerUserId: string,
    data: CreateUserSalaryDto,
  ) {
    return this.userSalaryService.createUserSalary(userId, partnerUserId, data);
  }

  async updateUserSalary(
    userId: string,
    salaryId: string,
    data: UpdateUserSalaryDto,
  ) {
    return this.userSalaryService.updateUserSalary(userId, salaryId, data);
  }

  async deleteUserSalary(userId: string, salaryId: string) {
    return this.userSalaryService.deleteUserSalary(userId, salaryId);
  }

  // ==================== Unallocated Customers ====================

  async findUnallocatedCustomers(
    brandId: string,
    partnerUser: AuthenticatedPartnerUser,
    paginationDto: { page: number; limit: number; search: string },
  ) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;
    const search = paginationDto.search?.trim() || "";

    // Build search condition
    let searchCondition: any = null;

    if (search.length > 0) {
      searchCondition = {
        OR: [
          { formattedUserId: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search, mode: "insensitive" } },
          {
            userDetails: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { middleName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ],
      };
    }

    // Build where condition for onboardingStep < 12
    const where = {
      brandId,
      isActive: true,
      onboardingStep: { lt: 12 }, // Less than 12 means still onboarding
      allocated_partner_user_id: null, // No allocation exists
      ...(searchCondition ? { AND: [searchCondition] } : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            formattedUserId: true,
            onboardingStep: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            status_id: true,
            is_terms_accepted: true,
            occupation_type_id: true,
            allocated_partner_user_id: true,
            userDetails: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
                dateOfBirth: true,
              },
            },
          },
        }),
        this.prisma.user.count({
          where,
        }),
      ]);

      // Transform data to match Customer interface
      const users = data.map((user: any) => ({
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        formattedUserId: user.formattedUserId,
        onboardingStep: user.onboardingStep,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        name: `${user.userDetails?.firstName || ""} ${user.userDetails?.lastName || ""}`.trim(),
        userDetails: user.userDetails,
        allocatedPartnerUserId: user.allocated_partner_user_id,
      }));

      return {
        users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || "Failed to fetch unallocated customers",
      );
    }
  }

  /**
   * Calculate name match score using Levenshtein distance algorithm
   * Returns a score from 0-100 where 100 is a perfect match
   * @param verifiedName - Name from penny drop verification
   * @param newName - Updated account holder name
   * @returns Match score (0-100)
   */
  private calculateNameMatchScore(
    verifiedName: string,
    newName: string,
  ): number {
    if (!verifiedName || !newName) return 0;

    // Normalize names: uppercase and remove extra spaces
    const name1 = verifiedName.toUpperCase().trim();
    const name2 = newName.toUpperCase().trim();

    // Perfect match
    if (name1 === name2) return 100;

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);

    // Convert distance to similarity score (0-100)
    const similarityScore = Math.round(
      ((maxLength - distance) / maxLength) * 100,
    );
    return Math.max(0, Math.min(100, similarityScore));
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for measuring string similarity
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Distance value
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    // Fill the dp table
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    return dp[len1][len2];
  }

  async checkIpAddressAssociation(userId: string) {
    // 1. Check if user exists
    const userExists = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        formattedUserId: true,
      },
    });

    if (!userExists) {
      throw new BadRequestException(`User with ID ${userId} not found`);
    }

    // 2. Get the LATEST login token for this user
    const loginToken = await this.prisma.userLoginToken.findFirst({
      where: {
        userId: userId,
        deviceId: {
          not: null,
        },
      },
      select: {
        deviceId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc", // Get the most recent
      },
    });

    if (!loginToken?.deviceId) {
      return {
        success: false,
        message: "No device information found for this user",
        targetUser: {
          formattedUserId: userExists.formattedUserId,
        },
      };
    }

    // 3. Get IP address from devices table using the deviceId from login token
    const device = await this.prisma.devices.findUnique({
      where: {
        id: loginToken.deviceId,
      },
      select: {
        id: true,
        ipAddress: true,
        deviceType: true,
        os: true,
        brandId: true,
        fpId: true,
        platformType: true,
      },
    });

    if (!device?.ipAddress) {
      return {
        success: false,
        message: "No IP address found for this user's device",
        targetUser: {
          formattedUserId: userExists.formattedUserId,
        },
        deviceInfo: {
          deviceType: device?.deviceType,
          osType: device?.os,
        },
      };
    }

    const ipAddress = device.ipAddress.trim();

    // 4. Find ALL devices with the same IP address
    const devicesWithSameIp = await this.prisma.devices.findMany({
      where: {
        ipAddress: ipAddress,
      },
      select: {
        id: true,
        brandId: true,
        fpId: true,
        deviceType: true,
      },
    });

    // If only one device found (the user's own device), return empty association
    if (devicesWithSameIp.length <= 1) {
      return {
        success: true,
        ipAddress: ipAddress,
        deviceInfo: {
          deviceType: device.deviceType,
          osType: device.os,
        },
        targetUser: {
          formattedUserId: userExists.formattedUserId,
        },
        associatedUsers: [],
        count: 0,
        summary: "No other accounts found with this IP address",
      };
    }

    // 5. Get device IDs (excluding the user's own device for cleaner query)
    const otherDeviceIds = devicesWithSameIp
      .filter((d) => d.id !== device.id)
      .map((d) => d.id);

    // 6. Find LATEST login tokens for each of these other devices
    // We need to get the latest token for each user on these devices
    const latestTokens = await this.prisma.userLoginToken.findMany({
      where: {
        deviceId: {
          in: otherDeviceIds,
        },
        userId: {
          not: userId, // Exclude current user
        },
      },
      select: {
        userId: true,
        deviceId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by userId to get only the latest token per user
    const latestTokensByUser = latestTokens.reduce((acc, token) => {
      if (
        !acc[token.userId] ||
        new Date(token.createdAt) > new Date(acc[token.userId].createdAt)
      ) {
        acc[token.userId] = token;
      }
      return acc;
    }, {});

    const associatedUserIds = Object.keys(latestTokensByUser);

    // 7. Get user details for associated users
    const associatedUsersData = await this.prisma.user.findMany({
      where: {
        id: {
          in: associatedUserIds,
        },
        formattedUserId: {
          not: null,
        },
      },
      select: {
        id: true,
        formattedUserId: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    const associatedUsers = associatedUsersData.map((user) => ({
      userId: user.id,
      formattedUserId: user.formattedUserId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userCreatedAt: user.createdAt,
    }));

    return {
      success: true,
      ipAddress: ipAddress,
      deviceInfo: {
        deviceType: device.deviceType,
        osType: device.os,
        deviceFingerprint: {
          brandId: device.brandId,
          fpId: device.fpId,
          platformType: device.platformType,
        },
      },
      targetUser: {
        formattedUserId: userExists.formattedUserId,
        userId: userExists.id,
      },
      associatedUsers: associatedUsers,
      count: associatedUsers.length,
      ipDeviceCount: devicesWithSameIp.length,
      summary:
        associatedUsers.length > 0
          ? `Found ${associatedUsers.length} other account(s) using the same IP address (${ipAddress})`
          : "No other accounts found with this IP address",
      debugInfo: {
        userDeviceId: device.id,
        totalDevicesWithSameIp: devicesWithSameIp.length,
        otherDeviceIds: otherDeviceIds,
      },
    };
  }

  private readonly toNumber = (v: any) =>
    Number(String(v || "0").replace(/,/g, "")) || 0;

  private readonly positive = (n: number) => (n > 0 ? n : 0);

  private readonly monthsDiff = (d?: string, fmt = "DD-MM-YYYY") =>
    d ? Math.abs(_dayjs().diff(_dayjs(d, fmt), "month")) : Infinity;

  private readonly isSecured = (l: any) =>
    l.secured === true || l.securityStatus === "Secured";

  private readonly isWriteOff = (l: any) =>
    ["WRITE-OFF", "WRITTEN-OFF", "LOSS", "DBT"].includes(
      (l.assetClass || "").toUpperCase(),
    );

  private readonly isLiveLoan = (l: any) => !l.isClosed && !this.isWriteOff(l);

  private readonly hasDPD = (history: any[], maxMonths: number) =>
    history?.some(
      (h) => this.monthsDiff(h.date) <= maxMonths && Number(h.dpd || 0) > 0,
    );

  private readonly isPaydayLoan = (l: any) => {
    const type = (l.loanType || "").toUpperCase();

    return (
      !this.isSecured(l) &&
      this.positive(l.balance) > 0 &&
      (type.includes("PERSONAL") ||
        type.includes("MICRO") ||
        type.includes("SHORT") ||
        type.includes("NBFC") ||
        type.includes("CREDIT CARD") ||
        type.includes("CONSUMER") ||
        type.includes("BUSINESS") ||
        type.includes("OTHER"))
    );
  };

  /* ---------------- SALARY ---------------- */

  private async getAverageSalary(userId: string) {
    const cam = await this.prisma.cam_calculators.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!cam) return 0;
    if (cam.avgSalary) return cam.avgSalary;

    const salaries = [
      cam.salaryAmount1,
      cam.salaryAmount2,
      cam.salaryAmount3,
    ].filter(Boolean) as number[];

    return salaries.length
      ? salaries.reduce((a, b) => a + b, 0) / salaries.length
      : 0;
  }

  /* ---------------- ENTRY ---------------- */

  async getBureauLoanSummary(userId: string) {
    const crif = await this.prisma.cirProV2SomeTable.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (crif?.rawReportJson) {
      return this.parseCrifData(crif.rawReportJson, userId);
    }

    const equifax = await this.prisma.equifaxSomeTable.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (equifax?.braReportJson) {
      return this.parseEquifaxData(equifax.braReportJson, userId);
    }

    throw new NotFoundException("No bureau data found");
  }

  /* ---------------- CRIF PARSER ---------------- */

  private parseCrifData(json: any, userId: string) {
    const std = json?.["CIR-REPORT-FILE"]?.["REPORT-DATA"]?.["STANDARD-DATA"];
    const tradelines = std?.TRADELINES || [];
    const enquiryHistory = std?.["INQUIRY-HISTORY"] || [];

    const enquiries = enquiryHistory
      .map((e) => ({
        amount: this.toNumber(e?.["AMOUNT"]),
        loanType: (e?.["LOAN-TYPE"] || "").toUpperCase(),
        date: e?.["INQUIRY-DT"],
        lenderName: e?.["LENDER-NAME"],
      }))
      .filter((e) => e.date);

    const score = std?.SCORE?.[0]?.VALUE || "N/A";

    const loans = tradelines.map((t) => {
      let emi = 0;

      const installment = t["INSTALLMENT-AMT"];
      if (installment) {
        const m = String(installment).match(/([\d,]+)/);
        if (m) emi = this.toNumber(m[1]);
      }

      if (!emi && t["ACTUAL-PAYMENT"]) {
        emi = this.toNumber(t["ACTUAL-PAYMENT"]);
      }

      return {
        openDate: t["DISBURSED-DT"],
        closeDate: t["CLOSED-DT"],
        isClosed: !!t["CLOSED-DT"],
        balance: this.toNumber(t["CURRENT-BAL"]),
        sanction: this.toNumber(t["DISBURSED-AMT"]),
        secured: t["SECURITY-STATUS"] === "Secured",
        assetClass: t["WRITTEN-OFF-SETTLED-STATUS"],
        loanType: (t["ACCT-TYPE"] || "").toUpperCase(),
        emi,
        history: (t.HISTORY?.[0]?.DATES || "")
          .split("|")
          .filter(Boolean)
          .map((d) => ({
            date: `01-${d.split(":")[0]}-${d.split(":")[1]}`,
            dpd: d.includes("STD") ? 0 : 30,
          })),
      };
    });

    return this.buildSummary("CRIF", score, loans, enquiries, userId);
  }

  /* ---------------- EQUIFAX PARSER ---------------- */

  private parseEquifaxData(json: any, userId: string) {
    const report = json?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData;

    const enquiries = (report?.EnquiryHistory || []).map((e) => ({
      amount: this.toNumber(e.Amount),
      loanType: (e.Purpose || "").toUpperCase(),
      date: e.Date,
      lenderName: e.EnquirerName,
    }));

    const tradelines = report?.RetailAccountDetails || [];
    const score = report?.ScoreDetails?.[0]?.Value || "N/A";

    const loans = tradelines.map((t) => ({
      openDate: t.DateOpened,
      closeDate: t.DateClosed,
      isClosed: t.Open === "No",
      balance: this.toNumber(t.Balance),
      sanction: this.toNumber(t.SanctionAmount),
      secured: t.CollateralType && t.CollateralType !== "No Collateral",
      assetClass: t.AccountStatus,
      loanType: (t.AccountType || "").toUpperCase(),
      emi: this.toNumber(t.InstallmentAmount),
      history: (t.History48Months || []).map((h) => ({
        date: `01-${h.key.split("-").reverse().join("-")}`,
        dpd: h.PaymentStatus === "000" ? 0 : 30,
      })),
    }));

    return this.buildSummary("EQUIFAX", score, loans, enquiries, userId);
  }

  private buildRow(loans: any[]) {
    const live = loans.filter((l) => this.isLiveLoan(l));

    const secured = live.filter((l) => this.isSecured(l));
    const unsecured = live.filter((l) => !this.isSecured(l));
    const payday = live.filter((l) => this.isPaydayLoan(l));

    return {
      closedSecuredTL: 0,
      closedSecuredValue: 0,

      closedUnsecuredTL: 0,
      closedUnsecuredValue: 0,

      liveTotalTL: live.length,
      liveTotalValue: live.reduce((s, l) => s + this.positive(l.balance), 0),

      liveSecuredTL: secured.length,
      liveSecuredValue: secured.reduce(
        (s, l) => s + this.positive(l.balance),
        0,
      ),

      liveUnsecuredTL: unsecured.length,
      liveUnsecuredValue: unsecured.reduce(
        (s, l) => s + this.positive(l.balance),
        0,
      ),

      paydayTL: payday.length,
      paydayValue: payday.reduce((s, l) => s + this.positive(l.balance), 0),
    };
  }

  // FIXED: Simplified enquiry calculation
  private buildEnquiryRow(enquiries: any[], loans: any[]) {
    // If no enquiries, return empty result
    if (enquiries.length === 0) {
      return {
        closedSecuredTL: 0,
        closedSecuredValue: 0,
        closedUnsecuredTL: 0,
        closedUnsecuredValue: 0,
        liveTotalTL: 0,
        liveTotalValue: 0,
        liveSecuredTL: 0,
        liveSecuredValue: 0,
        liveUnsecuredTL: 0,
        liveUnsecuredValue: 0,
        paydayTL: 0,
        paydayValue: 0,
      };
    }

    // For enquiries, we categorize based on loan type
    const securedEnquiries = enquiries.filter((e) => {
      const loanType = (e.loanType || "").toUpperCase();
      // Check for secured loan types
      return (
        loanType.includes("AUTO") ||
        loanType.includes("VEHICLE") ||
        loanType.includes("HOME") ||
        loanType.includes("HOUSING") ||
        loanType.includes("MORTGAGE") ||
        loanType.includes("GOLD") ||
        loanType.includes("LOAN AGAINST") ||
        loanType.includes("LAP") ||
        loanType.includes("TWO-WHEELER")
      );
    });

    const unsecuredEnquiries = enquiries.filter((e) => {
      const loanType = (e.loanType || "").toUpperCase();
      // Check for unsecured loan types
      return (
        loanType.includes("PERSONAL") ||
        loanType.includes("CREDIT CARD") ||
        loanType.includes("CONSUMER") ||
        loanType.includes("BUSINESS") ||
        loanType.includes("OTHER")
      );
    });

    // Payday enquiries - short term personal loans
    const paydayEnquiries = enquiries.filter((e) => {
      const loanType = (e.loanType || "").toUpperCase();
      return loanType.includes("PERSONAL") && e.amount <= 100000; // Assuming payday loans are small amounts
    });

    // Calculate total amounts
    const securedAmount = securedEnquiries.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const unsecuredAmount = unsecuredEnquiries.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const totalAmount = enquiries.reduce((sum, e) => sum + e.amount, 0);
    const paydayAmount = paydayEnquiries.reduce((sum, e) => sum + e.amount, 0);

    // For enquiries, "closed" and "live" don't really apply, so we use the same counts for both
    return {
      // Count secured enquiries
      closedSecuredTL: securedEnquiries.length,
      closedSecuredValue: securedAmount,

      // Count unsecured enquiries
      closedUnsecuredTL: unsecuredEnquiries.length,
      closedUnsecuredValue: unsecuredAmount,

      // Total enquiries (all are considered "live" for enquiry purposes)
      liveTotalTL: enquiries.length,
      liveTotalValue: totalAmount,

      // Same secured count for live
      liveSecuredTL: securedEnquiries.length,
      liveSecuredValue: securedAmount,

      // Same unsecured count for live
      liveUnsecuredTL: unsecuredEnquiries.length,
      liveUnsecuredValue: unsecuredAmount,

      // Payday enquiries
      paydayTL: paydayEnquiries.length,
      paydayValue: paydayAmount,
    };
  }

  private buildWriteOffRow(loans: any[]) {
    // Filter only write-off loans
    const writeOffLoans = loans.filter((l) => this.isWriteOff(l));

    if (writeOffLoans.length === 0) {
      return {
        closedSecuredTL: 0,
        closedSecuredValue: 0,
        closedUnsecuredTL: 0,
        closedUnsecuredValue: 0,
        liveTotalTL: 0,
        liveTotalValue: 0,
        liveSecuredTL: 0,
        liveSecuredValue: 0,
        liveUnsecuredTL: 0,
        liveUnsecuredValue: 0,
        paydayTL: 0,
        paydayValue: 0,
      };
    }

    // Categorize write-off loans
    const closed = writeOffLoans.filter((l) => l.isClosed);
    const live = writeOffLoans.filter((l) => !l.isClosed);

    const closedSecured = closed.filter((l) => this.isSecured(l));
    const closedUnsecured = closed.filter((l) => !this.isSecured(l));

    const liveSecured = live.filter((l) => this.isSecured(l));
    const liveUnsecured = live.filter((l) => !this.isSecured(l));

    const payday = writeOffLoans.filter(
      (l) =>
        l.openDate &&
        l.closeDate &&
        _dayjs(l.closeDate).diff(_dayjs(l.openDate), "day") <= 45,
    );

    // For write-offs, use sanction amount (not balance)
    const paydayValue = payday.reduce((s, l) => s + (l.sanction || 0), 0);

    return {
      closedSecuredTL: closedSecured.length,
      closedSecuredValue: closedSecured.reduce(
        (s, l) => s + (l.sanction || 0),
        0,
      ),

      closedUnsecuredTL: closedUnsecured.length,
      closedUnsecuredValue: closedUnsecured.reduce(
        (s, l) => s + (l.sanction || 0),
        0,
      ),

      liveTotalTL: live.length,
      liveTotalValue: live.reduce((s, l) => s + (l.balance || 0), 0),

      liveSecuredTL: liveSecured.length,
      liveSecuredValue: liveSecured.reduce((s, l) => s + (l.balance || 0), 0),

      liveUnsecuredTL: liveUnsecured.length,
      liveUnsecuredValue: liveUnsecured.reduce(
        (s, l) => s + (l.balance || 0),
        0,
      ),

      paydayTL: payday.length,
      paydayValue: paydayValue,
    };
  }

  private async buildSummary(
    source: string,
    score: string,
    loans: any[],
    enquiries: any[],
    userId: string,
  ) {
    const salary = await this.getAverageSalary(userId);

    const enquiry3 = enquiries.filter((e) => this.monthsDiff(e.date) <= 3);
    const enquiry6 = enquiries.filter((e) => this.monthsDiff(e.date) <= 6);

    const dpd3Loans = loans.filter(
      (l) => this.isLiveLoan(l) && this.hasDPD(l.history, 3),
    );

    const dpd6Loans = loans.filter(
      (l) => this.isLiveLoan(l) && this.hasDPD(l.history, 6),
    );

    const wo3 = loans.filter(
      (l) => this.isWriteOff(l) && this.monthsDiff(l.closeDate) <= 3,
    );
    const wo6 = loans.filter(
      (l) => this.isWriteOff(l) && this.monthsDiff(l.closeDate) <= 6,
    );
    const wo12 = loans.filter(
      (l) => this.isWriteOff(l) && this.monthsDiff(l.closeDate) <= 12,
    );
    const wo24 = loans.filter(
      (l) => this.isWriteOff(l) && this.monthsDiff(l.closeDate) <= 24,
    );

    const paydayOutstanding = loans
      .filter((l) => this.isLiveLoan(l) && this.isPaydayLoan(l))
      .reduce((sum, l) => sum + this.positive(l.balance), 0);

    // Monthly liability = EMI of all live loans
    const monthlyObligation = loans
      .filter((l) => this.isLiveLoan(l))
      .reduce((sum, l) => sum + this.positive(l.emi), 0);

    return {
      source,
      score,

      debt: this.buildRow(loans),

      enquiryLast3Months: this.buildEnquiryRow(enquiry3, loans),
      enquiryLast6Months: this.buildEnquiryRow(enquiry6, loans),
      enquiryTotal: this.buildEnquiryRow(enquiries, loans),

      dpdLast3Months: this.buildRow(dpd3Loans),
      dpdLast6Months: this.buildRow(dpd6Loans),

      writeOffLast3Months: this.buildWriteOffRow(wo3),
      writeOffLast6Months: this.buildWriteOffRow(wo6),
      writeOffLast12Months: this.buildWriteOffRow(wo12),
      writeOffLast24Months: this.buildWriteOffRow(wo24),

      leverage: {
        vsPaydayLiability:
          salary && paydayOutstanding > 0
            ? +(paydayOutstanding / salary).toFixed(2)
            : null,

        vsMonthlyLiability:
          salary && monthlyObligation > 0
            ? +(monthlyObligation / salary).toFixed(2)
            : null,
      },
    };
  }
}

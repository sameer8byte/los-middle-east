import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from "@nestjs/common";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { PrismaService } from "src/prisma/prisma.service";
import {
  AAConsentStatus,
  document_status_enum,
  DocumentTypeEnum,
  loan_status_enum,
  ModeOfSalary,
  notification_priority_enum,
  platform_type,
  Prisma,
  user_bank_verification_method,
  user_bank_verification_status,
  user_data_status,
  User,
  UserDetails,
  Document,
  Employment,
  BrandConfig,
} from "@prisma/client";
import { ApplicationPage, getPageFromId } from "src/constant/redirect";
import { GeoCodingService } from "src/external/geocoding/geocoding.service";
import { NotificationService } from "src/features/notification/notification.service";
import {
  LoanApplicationDto,
  SalaryThreshold,
  ProfessionType,
} from "src/features/brandRuleValidation/brand.application.dto";
import { v4 as uuid } from "uuid";
import { getRoleId, RoleEnum } from "src/constant/roles";
import { AutoAllocationUserService } from "src/features/autoAllocation/services/user.autoAllocation.service";
import * as dayjs from "dayjs";
import { AutoAllocationLoanService } from "src/features/autoAllocation/services/loan.autoAllocation.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
import { OccupationTypeEnum, UserStatusEnum } from "src/constant/enum";
import { BrandRulesValidationService } from "src/features/brandRuleValidation/brand.validation.service";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoCodingService: GeoCodingService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
    private readonly autoAllocationUserService: AutoAllocationUserService,
    private readonly autoAllocationLoanService: AutoAllocationLoanService,
    private readonly brandRulesValidationService: BrandRulesValidationService,
  ) {}
  async createUser(
    createUserDto: CreateUserDto,
    autoAllocate: boolean = true,
    loanAutoAllocate: boolean = true,
    isCreateUsersWithLoan: boolean = false,
  ) {
    try {
      // get brand details including default loan risk category
      const brand = await this.prisma.brand.findUnique({
        where: { id: createUserDto.brandId },
        select: {
          defaultLoanRiskCategory: true,
        },
      });

      if (!brand) {
        throw new BadRequestException(
          `Brand not found for brandId ${createUserDto.brandId}`,
        );
      }

      if (!brand.defaultLoanRiskCategory) {
        throw new BadRequestException(
          `No defaultLoanRiskCategory found for brandId ${createUserDto.brandId}`,
        );
      }

      const brandConfig = await this.prisma.brandConfig.findUnique({
        where: { brandId: createUserDto.brandId },
        select: {
          autoAllocationType: true,
          signUpVersion: true,
          is_loan_onboarding: true,
        },
      });

      if (!brandConfig) {
        throw new NotFoundException(
          `Brand config not found with ID: ${createUserDto.brandId}`,
        );
      }

      const isLoanOnboarding =
        brandConfig.is_loan_onboarding || isCreateUsersWithLoan;

      const userCreateData: Prisma.UserCreateInput = {
        ...createUserDto,
        signUpVersion: brandConfig.signUpVersion || "V1",
        userDetails: {
          create: {
            firstName: null,
            lastName: null,
            dateOfBirth: null,
          },
        },
        employment: {
          create: {
            companyName: null,
            designation: null,
            officialEmail: null,
            joiningDate: null,
            salary: null,
            companyAddress: null,
            pinCode: null,
            uanNumber: null,
            expectedDateOfSalary: null,
            modeOfSalary: "BANK_TRANSFER",
          },
        },
        user_bank_account: {
          create: {
            isPrimary: true,
            accountHolderName: "",
            accountNumber: "",
            ifscCode: "",
            bankAddress: "",
            bankName: "",
            accountType: "SAVINGS",
            verificationMethod: user_bank_verification_method.MANUAL,
            verificationStatus: user_bank_verification_status.PENDING,
          },
        },
        onboardingJourneys: {
          create: {
            stepNumber: 1,
            brandId: createUserDto.brandId,
            reason: "User Created",
          },
        },
      };
      if (isLoanOnboarding) {
        userCreateData.loans = {
          create: {
            id: uuid(),
            purpose: "Initial Loan (Onboarding)",
            amount: 0,
            ruleType: brand.defaultLoanRiskCategory,
            status: loan_status_enum.ONBOARDING,
            isActive: true,
            brandId: createUserDto.brandId,
            loanDetails: {
              create: {
                id: uuid(),
                dueDate: new Date(),
                type: "PAYDAY_LOAN",
                durationDays: 0,
              },
            },
          },
        };
      }

      const user = await this.prisma.user.create({
        data: userCreateData,
        include: {
          loans: true,
        },
      });
      if (autoAllocate && !isLoanOnboarding) {
        try {
          const nextPartnerUser =
            await this.autoAllocationUserService.getNextPartnerUserForAllocation(
              createUserDto.brandId,
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
                } (Phone: ${createUserDto.phoneNumber || "N/A"}, Email: ${createUserDto.email || "N/A"}) has been created and allocated to ${nextPartnerUser.name || "Unknown Partner"}.`,
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

      if (loanAutoAllocate && isLoanOnboarding) {
        try {
          const loanId = user.loans?.[0]?.id;
          if (!loanId) {
            throw new Error("Loan was not created for the user");
          }
          const nextPartnerUser =
            await this.autoAllocationLoanService.nextCreditExecutivePartnerUser(
              user.id,
              user.brandId,
              false,
              brandConfig?.autoAllocationType as "LOGIN" | "ATTENDANCE",
            );
          if (nextPartnerUser?.id && nextPartnerUser?.reportsToId) {
            const partnerUserIds = new Set<string>([
              nextPartnerUser.id,
              nextPartnerUser.reportsToId,
            ]);

            await this.prisma.loanAllottedPartnerUser.createMany({
              data: Array.from(partnerUserIds)
                .filter(Boolean)
                .map((partnerUserId) => ({
                  id: uuid(),
                  loanId,
                  partnerUserId,
                  allottedAt: new Date(),
                })),
            });
          }
        } catch (loanAllocationError) {
          this.logger.error(
            `Failed to auto-allocate loans for user ${user.id}: ${loanAllocationError.message}`,
            loanAllocationError.stack,
          );
        }
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }
  async findByPhoneOrEmail({
    email,
    phoneNumber,
    brandId,
    type,
  }: {
    email?: string;
    phoneNumber?: string;
    brandId: string;
    type: "email" | "phone";
  }) {
    try {
      let user;
      if (type === "email") {
        user = await this.prisma.user.findFirst({
          where: {
            email,
            brandId,
          },
        });
      } else if (type === "phone") {
        user = await this.prisma.user.findFirst({
          where: {
            phoneNumber,
            brandId,
          },
        });
      } else {
        throw new NotFoundException(`Invalid type provided: ${type}`);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string, include?: Prisma.UserInclude) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: include ?? {}, // fallback to empty object if not provided
    });

    if (!user) {
      this.logger.error(`User not found with ID: ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // this.logger.log(`User found successfully with ID: ${id}`);
    return user;
  }

  async findOneWithAllotments(id: string, include?: Prisma.UserInclude) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        ...include,
      },
    });

    if (!user) {
      this.logger.error(`User not found with ID: ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Fetch allocated partner details if allocated_partner_user_id exists
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

    // Return user with allocated partner info
    return {
      ...user,
      user_allotted_partner_user: allocatedPartner
        ? [
            {
              id: allocatedPartner.id,
              partnerUser: allocatedPartner,
            },
          ]
        : [],
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      await this.findOne(id);
      // Exclude fields that cannot be updated
      const {
        brandId,
        brandSubDomainId,
        status_id,
        occupation_type_id,
        ...updateData
      } = updateUserDto;
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async validateBlocklists(
    userId: string,
    brandId: string,
    docs: Document[],
    user: User,
    employment: Employment | null,
    details: UserDetails | null,
    brandConfig: Partial<BrandConfig>,
  ): Promise<{ blockMessages: string[]; shouldBlock: boolean }> {
    const blockMessages: string[] = [];

    try {
      // Extract validation data
      const panDoc = docs.find((doc) => doc.type === DocumentTypeEnum.PAN);
      // Build validation DTO with whatever data is available
      const validationDto = this.buildValidationDto(
        panDoc,
        user,
        employment,
        details,
        brandConfig,
      );
      console.log("Validation DTO:", validationDto);
      // Run validation
      const validationResult = await this.brandRulesValidationService.validate(
        brandId,
        validationDto,
      );
      console.log("Validation Result:", validationResult);
      // Determine which blocklist parameters to check based on available data
      const blocklistParamNames: string[] = [];
      if (panDoc?.documentNumber) blocklistParamNames.push("PAN Card");
      if (user.phoneNumber) blocklistParamNames.push("Phone Number");
      if (details?.pincode) blocklistParamNames.push("Pin Code");
      if (employment?.salary)
        blocklistParamNames.push("Monthly Salary / Turnover");
      if (details?.dateOfBirth) blocklistParamNames.push("Age");
      if (user.occupation_type_id) blocklistParamNames.push("profession"); // profession is always checked if available
      console.log("Blocklist Parameters to Check:", blocklistParamNames);
      // Filter only for blocklist failures on available data
      const blocklistFailures = validationResult.results.filter(
        (result) =>
          result.status === "FAIL" &&
          blocklistParamNames.some((param) => result.paramName.includes(param)),
      );
      console.log("Blocklist Failures:", blocklistFailures);

      if (blocklistFailures.length > 0) {
        const rejectionReasonIds = blocklistFailures
          .map((failure) => failure.rejectionReasonId)
          .filter(Boolean);

        await this.updateUserBlockStatus(userId, rejectionReasonIds);
      }
    } catch (error) {
      this.logger.error(
        `Error validating brand rules for user ${userId}: ${error.message}`,
        error.stack,
      );
    }

    // Update DB if there are block messages
    if (blockMessages.length > 0) {
    }
    return {
      blockMessages,
      shouldBlock: blockMessages.length > 0,
    };
  }

  private buildValidationDto(
    panDoc: Document | undefined,
    user: User,
    employment: Employment | null,
    details: UserDetails | null,
    brandConfig: Partial<BrandConfig>,
  ): LoanApplicationDto {
    // Calculate age
    const age = details?.dateOfBirth
      ? _dayjs().diff(_dayjs(details.dateOfBirth), "year")
      : 0;

    // Determine salary threshold
    const salary = employment?.salary || 0;
    let salaryThreshold: SalaryThreshold | undefined;
    if (brandConfig.salaryThresholdAmount && salary) {
      salaryThreshold =
        salary >= brandConfig.salaryThresholdAmount
          ? SalaryThreshold.ABOVE
          : SalaryThreshold.BELOW;
    }

    // Determine profession
    const profession =
      user.occupation_type_id === BigInt(OccupationTypeEnum.SALARIED)
        ? ProfessionType.SALARIED
        : ProfessionType.SELF_EMPLOYED;

    return {
      profession,
      panCard: panDoc?.documentNumber,
      phoneNumber: user.phoneNumber || undefined,
      age,
      salaryThreshold,
      pinCode: details?.pincode,
    };
  }

  private async updateUserBlockStatus(
    userId: string,
    rejectionReasonIds: string[] = [],
  ): Promise<void> {
    console.log(
      `Blocking user ${userId} for reasons: ${rejectionReasonIds.join(", ")}`,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { status_id: UserStatusEnum.BLOCKED },
    });
    if (rejectionReasonIds.length > 0) {
      await this.prisma.user_status_brand_reasons.createMany({
        data: rejectionReasonIds.map((reasonId) => ({
          id: uuid(),
          userId: userId,
          brandStatusReasonId: reasonId,
        })),
        skipDuplicates: true,
      });
    }
  }

  async updateOnboardingStep(
    id: string,
    dto: {
      latitude: number;
      longitude: number;
      ipJson: string;
    },
  ) {
    const FINAL_STEP = 12;

    try {
      // Check if user exists
      const user = await this.findOne(id, {
        userDetails: true,
        employment: true,
        documents: true,
        userGeoTags: true,
        aa_consent_requests: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      });

      const isMigrationUser = user.migrationStatus === "MIGRATED" || false;
      // Check if user is blocked

      const brand = await this.prisma.brand.findUnique({
        where: { id: user.brandId },
        include: {
          brandConfig: {
            select: {
              salaryThresholdAmount: true,
              rejectionDuration: true,
              forceEmployment: true,
              isAadharImageRequired: true,
              isAA: true,
              requiresUserPhoto: true,
              requiresUserVideo: true,
              forceSkipEmployment: true,
              isAlternateNumber: true,
            },
          },
          brandProviders: {
            where: {
              isActive: true,
              isDisabled: false,
            },
          },
        },
      });
      if (!user) {
        throw new NotFoundException(`User not found with ID: ${id}`);
      }
      if (!brand) {
        throw new NotFoundException(`Brand not found with ID: ${user.brandId}`);
      }

      const step = user.onboardingStep || 0;
      const getPage = getPageFromId(step);
      if (!getPage) {
        throw new NotFoundException(`Invalid onboarding step: ${step}`);
      }
      if (user.onboardingStep > step) {
        return user;
      }
      const throwIfInvalid = (condition: unknown, message: string) => {
        if (!condition) throw new BadRequestException(message);
      };
      const docs = user.documents || [];
      const hasApprovedDoc = (type: string) =>
        docs.some(
          (doc) =>
            doc.type === type && doc.status === document_status_enum.APPROVED,
        );

      await this.validateBlocklists(
        id,
        user.brandId,
        docs,
        user,
        user.employment,
        user.userDetails,
        brand.brandConfig,
      );
      switch (getPage) {
        case ApplicationPage.CurrentStatus:
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User completed Current Status step`,
              type: "Home",
              platformType: "WEB",
              context: {
                step: getPage,
                currentStatus: user.status_id,
              },
            });
          }
          break;
        case ApplicationPage.LoanApplicationKyc:
          const userDetails = user.userDetails;
          throwIfInvalid(
            hasApprovedDoc(DocumentTypeEnum.PAN),
            "Approved PAN document is required for KYC verification",
          );
          throwIfInvalid(
            userDetails.firstName && userDetails.lastName,
            "First name and last name are required",
          );
          throwIfInvalid(userDetails.dateOfBirth, "Date of birth is required");
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User completed KYC step`,
              type: "LoanApplicationKyc",
              platformType: "WEB",

              context: {
                step: getPage,
                hasPAN: hasApprovedDoc(DocumentTypeEnum.PAN),
                firstName: user.userDetails?.firstName,
                lastName: user.userDetails?.lastName,
              },
            });
          }
          break;
        case ApplicationPage.LoanApplicationAddressVerification:
          const aadhaarDocs = docs.find(
            (doc) => doc.type === DocumentTypeEnum.AADHAAR,
          );
          throwIfInvalid(
            hasApprovedDoc(DocumentTypeEnum.AADHAAR) ||
              (aadhaarDocs?.frontDocumentUrl && aadhaarDocs?.backDocumentUrl),
            "Approved Aadhaar document is required for KYC verification",
          );
          if (brand.brandConfig.isAlternateNumber) {
            const alternateFAMILY_MEMBER =
              await this.prisma.alternatePhoneNumber.count({
                where: { userId: id, isVerified: true, label: "FAMILY_MEMBER" },
              });
            throwIfInvalid(
              alternateFAMILY_MEMBER > 0,
              "family member phone number is required",
            );
            // NON_FAMILY_MEMBER
            const alternateNON_FAMILY_MEMBER =
              await this.prisma.alternatePhoneNumber.count({
                where: {
                  userId: id,
                  isVerified: true,
                  label: "NON_FAMILY_MEMBER",
                },
              });
            throwIfInvalid(
              alternateNON_FAMILY_MEMBER > 0,
              "Non-family member phone number is required",
            );
          }
          if (brand.brandConfig.isAadharImageRequired) {
            if (
              !aadhaarDocs?.frontDocumentUrl ||
              !aadhaarDocs?.backDocumentUrl
            ) {
              throw new BadRequestException(
                "Aadhaar front and back images are required",
              );
            }
          }
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User completed Address Verification step`,
              type: "LoanApplicationKyc",
              platformType: "WEB",

              context: {
                step: getPage,
                hasAadhaar: hasApprovedDoc(DocumentTypeEnum.AADHAAR),
              },
            });
          }

          break;
        case ApplicationPage.LoanApplicationPersonalInfo: {
          const userGeoLocation = user.userGeoTags.map((geo) => geo.postalCode);
          const details = user.userDetails;
          throwIfInvalid(details, "User details are required");
          throwIfInvalid(
            details.firstName && details.lastName,
            "First name and last name are required",
          );
          throwIfInvalid(details.dateOfBirth, "Date of birth is required");
          throwIfInvalid(details.gender, "Gender is required");
          throwIfInvalid(details.maritalStatus, "Marital status is required");
          throwIfInvalid(details.religion, "Religion is required");
          throwIfInvalid(details.address, "Address is required");
          throwIfInvalid(details.city, "City is required");
          throwIfInvalid(details.state, "State is required");
          throwIfInvalid(details.pincode, "PIN code is required");
          throwIfInvalid(details.fathersName, "Father's name is required");
          if (!details.isCommunicationAddress) {
            const alternateAddress =
              await this.prisma.alternateAddress.findFirst({
                where: { userId: id },
              });
            throwIfInvalid(
              !!alternateAddress,
              "Alternate address is required when communication address is different",
            );
            // check if alternate address filePrivateKey is present
            throwIfInvalid(
              alternateAddress?.filePrivateKey,
              "Address proof document is required when communication address is different",
            );
            throwIfInvalid(
              alternateAddress?.addressProofType,
              "Address proof type is required when communication address is different",
            );
          } else {
            const matchingPincodes = userGeoLocation.filter(
              (p) => p?.substring(0, 5) === details.pincode?.substring(0, 5),
            );

            if (matchingPincodes.length === 0) {
              // If no matching pincode found, check if address proof is present
              throwIfInvalid(
                details.filePrivateKey,
                "Address proof document is required",
              );
              throwIfInvalid(
                details.addressProofType,
                "Address proof type is required",
              );
            }
          }
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: 'User is completed Personal Info step"',
              type: "LoanApplicationPersonalInfo",
              platformType: "WEB",

              context: {
                step: getPage,
                city: user.userDetails?.city,
                state: user.userDetails?.state,
                pincode: user.userDetails?.pincode,
              },
            });
          }

          break;
        }
        case ApplicationPage.LoanApplicationEmploymentInfo:
          const emp = user.employment;
          throwIfInvalid(emp, "Employment details are required");
          throwIfInvalid(emp.companyName, "Company name is required");
          throwIfInvalid(emp.officialEmail, "Official email is required");
          throwIfInvalid(
            emp.expectedDateOfSalary,
            "Expected salary date is required",
          );
          throwIfInvalid(emp.modeOfSalary, "Salary payment mode is required");

          if (!emp.salaryExceedsBase) {
            throwIfInvalid(
              emp.salary,
              "Salary information is required when salary exceeds base",
            );
          }
          await this.prisma.employment.update({
            where: { id: emp.id },
            data: {
              userDataStatus: user_data_status.VERIFIED_BY_USER,
            },
          });
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User completed Employment Info step`,
              type: "LoanApplicationEmploymentInfo",
              platformType: "WEB",

              context: {
                step: getPage,
                companyName: user.employment?.companyName,
                designation: user.employment?.designation,
                modeOfSalary: user.employment?.modeOfSalary,
              },
            });
          }
          break;
        case ApplicationPage.LoanApplicationBankDetails:
          if (!isMigrationUser) {
            const user_bank_account =
              await this.prisma.userBankAccount.findFirst({
                where: {
                  userId: id,
                  // isVerified: true,
                },
              });
            const bank = user_bank_account;
            const bankStatement = await this.prisma.bankAccountStatement.count({
              where: { userId: id },
            });
            throwIfInvalid(bank, "Bank account details are required");
            // throwIfInvalid(bank.isVerified, "Bank account must be verified");
            throwIfInvalid(
              bank.accountHolderName,
              "Account holder name is required",
            );
            throwIfInvalid(bank.accountNumber, "Account number is required");
            throwIfInvalid(bank.ifscCode, "IFSC code is required");
            throwIfInvalid(bank.bankName, "Bank name is required");
            throwIfInvalid(bank.accountType, "Account type is required");
            throwIfInvalid(
              bank.verificationMethod,
              "Verification method is required",
            );
            throwIfInvalid(
              bank.verificationStatus,
              "Verification status is required",
            );
            // throwIfInvalid(bank.verifiedAt, "Verification date is required");
            if (brand.brandConfig.isAA) {
              const isAACompliant = user.aa_consent_requests.filter(
                (consent) => consent.consentStatus === AAConsentStatus.ACTIVE,
              );

              throwIfInvalid(
                bankStatement > 0 || isAACompliant.length > 0,
                "A bank statement document or an active AA consent is required to proceed.",
              );
            } else {
              throwIfInvalid(
                bankStatement > 0,
                "A bank statement document is required to proceed.",
              );
            }
            if (this.awsAuditLogsSqsService) {
              await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
                userId: id,
                brandId: user.brandId,
                message: `User completed Bank Details step`,
                type: "LoanApplicationBankDetails",
                platformType: "WEB",

                context: {
                  step: getPage,
                  bankName: user_bank_account?.bankName,
                  accountType: user_bank_account?.accountType,
                  // isVerified: user_bank_account?.isVerified,
                },
              });
            }
            // update bank account status to user verified
            await this.prisma.userBankAccount.update({
              where: { id: bank.id },
              data: {
                userDataStatus: user_data_status.VERIFIED_BY_USER,
              },
            });
          }
          break;
        case ApplicationPage.LoanApplicationSelfie:
          if (
            brand.brandConfig.requiresUserPhoto ||
            brand.brandConfig.requiresUserVideo
          ) {
            if (brand.brandConfig.requiresUserPhoto) {
              throwIfInvalid(
                user.userDetails?.profilePicUrl,
                "Profile picture is required",
              );
            }
            if (brand.brandConfig.requiresUserVideo) {
              throwIfInvalid(
                user.userDetails?.profileVideoUrl,
                "Profile video is required",
              );
            }
            if (this.awsAuditLogsSqsService) {
              await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
                userId: id,
                brandId: user.brandId,
                message: `User completed Selfie step`,
                type: "Home",
                platformType: "WEB",

                context: {
                  step: getPage,
                  hasProfilePic: !!user.userDetails?.profilePicUrl,
                  hasProfileVideo: !!user.userDetails?.profileVideoUrl,
                },
              });
            }
          }
          break;
        case ApplicationPage.PhoneVerification:
          throwIfInvalid(user.phoneNumber, "Phone number is required");
          throwIfInvalid(user.isPhoneVerified, "Phone number must be verified");
          // Log phone verification step
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User completed Phone Verification step`,
              type: "PhoneVerification",

              platformType: "WEB",

              context: {
                step: getPage,
                phoneNumber: user.phoneNumber,
                isVerified: user.isPhoneVerified,
              },
            });
          }
          break;
        case ApplicationPage.EmailVerification:
          // Log email verification step

          throwIfInvalid(user.email, "Email address is required");
          throwIfInvalid(user.isEmailVerified, "Email must be verified");
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User completed Email Verification step`,
              type: "EmailVerification",

              platformType: "WEB",

              context: {
                step: getPage,
                email: user.email,
                isVerified: user.isEmailVerified,
              },
            });
          }
          break;
        case ApplicationPage.LoanApplication:
          // Log loan application step
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User accessed Loan Application step`,
              type: "Home",

              platformType: "WEB",

              context: {
                step: getPage,
              },
            });
          }
          break;
        case ApplicationPage.LoanApplicationReview:
          // Log loan application review step
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User reviewed Loan Application`,
              type: "Home",

              platformType: "WEB",

              context: {
                step: getPage,
              },
            });
          }
          break;
        case ApplicationPage.LoanApplicationSubmit:
          // Log loan application submit step
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User submitted Loan Application`,
              type: "Home",

              platformType: "WEB",

              context: {
                step: getPage,
              },
            });
          }
          break;
        case ApplicationPage.Home:
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User completed onboarding and reached Home`,
              type: "Home",

              platformType: "WEB",

              context: {
                step: getPage,
              },
            });
          }
          break;

        default:
          throw new NotFoundException(`Invalid application page: ${step}`);
      }
      const geoLocationAddress = await this.prisma.userGeoTag.count({
        where: { userId: id },
      });
      try {
        if (dto.latitude && dto.longitude && geoLocationAddress === 0) {
          const addressDetails =
            await this.geoCodingService.getFullAddressDetails(
              dto.latitude,
              dto.longitude,
            );
          if (addressDetails) {
            await this.prisma.userGeoTag.create({
              data: {
                userId: id,
                latitude: dto.latitude,
                longitude: dto.longitude,
                address: addressDetails.formattedAddress,
                postalCode: addressDetails.postalCode,
                city: addressDetails.city,
                district: addressDetails.district,
                state: addressDetails.state,
                country: addressDetails.country,
                street: addressDetails.street,
                sublocality: addressDetails.sublocality,
                notes: `GEO CODING:User has completed onboarding step ${getPageFromId(
                  step,
                )}`,
              },
            });
          }
        }
      } catch (error) {
        this.logger.error(
          `Error saving geolocation for user ${id} at step ${step}: ${error.message}`,
          error.stack,
        );
      }
      try {
        if (Number(step) + 1 === FINAL_STEP) {
          if (geoLocationAddress === 0) {
            const jsonIp = JSON.parse(dto.ipJson);
            if (jsonIp && jsonIp.latitude && jsonIp.longitude) {
              const addressDetails =
                await this.geoCodingService.getFullAddressDetails(
                  jsonIp.latitude,
                  jsonIp.longitude,
                );
              if (addressDetails) {
                await this.prisma.userGeoTag.create({
                  data: {
                    userId: id,
                    latitude: dto.latitude,
                    longitude: dto.longitude,
                    address: addressDetails.formattedAddress,
                    postalCode: addressDetails.postalCode,
                    city: addressDetails.city,
                    district: addressDetails.district,
                    state: addressDetails.state,
                    country: addressDetails.country,
                    street: addressDetails.street,
                    sublocality: addressDetails.sublocality,
                    notes: `IP CODING:User has completed onboarding step ${getPageFromId(
                      step,
                    )}`,
                  },
                });
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error processing final step for user ${id}: ${error.message}`,
          error.stack,
        );
      }

      let newOnboardingStep =
        Number(step) + 1 > FINAL_STEP ? FINAL_STEP : Number(step) + 1;
      // Skip step 8 if AA consent already exists and employment is not forced
      if (newOnboardingStep === 8 && !brand.brandConfig.forceEmployment) {
        const hasActiveConsent = user.aa_consent_requests.some(
          (consent) => consent.consentStatus === AAConsentStatus.ACTIVE,
        );
        if (hasActiveConsent) {
          newOnboardingStep = 9;
        }
        if (brand.brandConfig.forceSkipEmployment) {
          newOnboardingStep = 9;
        }
      }
      // skip review step
      if (newOnboardingStep === 11) {
        newOnboardingStep = 12; // skip review step
      }
      // skip selfie step if not required
      if (
        newOnboardingStep === 9 &&
        !brand.brandConfig.requiresUserPhoto &&
        !brand.brandConfig.requiresUserVideo
      ) {
        newOnboardingStep = 10; // skip selfie step
      }

      try {
        const updatedUser = await this.prisma.user.update({
          where: { id },
          data: {
            onboardingStep: newOnboardingStep,
          },
        });

        try {
          // await this.prisma.onboardingJourney.upsert({
          //   where: {
          //     userId_stepNumber: {
          //       userId: user.id,
          //       stepNumber: newOnboardingStep || 1,
          //     },
          //   },
          //   update: {
          //     brandId: user.brandId,
          //     createdAt: new Date(),
          //   },
          //   create: {
          //     userId: user.id,
          //     stepNumber: newOnboardingStep || 1,
          //     brandId: user.brandId,
          //     createdAt: new Date(),
          //     reason: `Completed step ${getPageFromId(step)}`,
          //   },
          // });

          // Log step progression
          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
              userId: id,
              brandId: user.brandId,
              message: `User progressed from step ${step} to ${newOnboardingStep}`,
              type: "Home",
              platformType: "WEB",

              context: {
                previousStep: getPageFromId(step),
                newStep: getPageFromId(newOnboardingStep),
                stepNumber: newOnboardingStep,
              },
            });
          }
          // this.logger.log(
          //   `Onboarding step updated successfully for user: ${id}, new step: ${updatedUser.onboardingStep}`
          // );
        } catch (err) {
          console.error(
            `Failed to update onboarding journey: ${err.message}`,
            err.stack,
          );
        }

        return updatedUser;
      } catch (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }
}

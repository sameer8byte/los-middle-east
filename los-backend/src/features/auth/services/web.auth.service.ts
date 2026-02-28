import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  Optional,
} from "@nestjs/common";
import { VerifyOtpDto } from "../dto/verify.dto";
import { OAuth2Client } from "google-auth-library";
import { GoogleLoginDto } from "../dto/google-login.dto";
import {
  DocumentTypeEnum,
  ModeOfSalary,
  platform_type,
  User,
} from "@prisma/client";
import { Response } from "express";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { PrismaService } from "src/prisma/prisma.service";
import * as path from "path";
import * as ejs from "ejs";
import { LoginTokenService } from "src/shared/loginToken/login-token.service";
import { OtpVerificationService } from "src/shared/otpVerification/otp-verification.service";
import { UsersService } from "src/shared/user/user.service";
import { EmailService } from "src/core/communication/services/email.service";
import { SmsService } from "src/core/communication/services/sms.service";
import { KycService } from "src/app/web/kyc/web.kyc.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
import { BrandRulesValidationService } from "src/features/brandRuleValidation/brand.validation.service";
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  private readonly isDev: boolean = process.env.NODE_ENV !== "production";

  constructor(
    private readonly usersService: UsersService,
    private readonly otpVerificationService: OtpVerificationService,
    private readonly loginTokenService: LoginTokenService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
    private readonly kycService: KycService,
    private readonly brandRulesValidationService: BrandRulesValidationService,
  ) {}

  /**
   *
   * @param email
   * @param brandId
   * @param userId
   * @returns
   */
  async sendEmail(email: string, brandId: string, userId: string) {
    if (!email || !brandId || !userId) {
      throw new BadRequestException("Invalid request");
    }
    // Check if the user exists
    let user = await this.usersService.findOne(userId);
    const brand = await this.prisma.brand.findUnique({
      where: {
        id: brandId,
      },
      include: {
        brandDetails: true,
      },
    });
    const isUATServices =
      brand?.isUATServices || email === "testUser@qualoan.com";
    if (!brand) {
      throw new BadRequestException("Brand not found");
    }

    // Check if the user exists`
    if (!user) {
      // throw an error if the user is not found
      throw new BadRequestException("User not found");
    }

    // Check if the user has a verified phone number
    if (!user.isPhoneVerified) {
      throw new BadRequestException("Phone number not verified");
    }
    // Check if the user exists
    const userEmail = await this.usersService.findByPhoneOrEmail({
      email,
      brandId,
      type: "email",
    });
    if (userEmail && userEmail?.id !== userId) {
      // If the email is already associated with the user, return the user
      throw new BadRequestException(
        "Email already associated with another user",
      );
    }

    // Check if the user exists
    // if (!user.email || !user.isEmailVerified) {
    if (!user.email && email) {
      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: user.id,
        message: `Email OTP sent to ${email}`,
        type: "EmailVerification",
        brandId: brandId,
        platformType: platform_type.WEB,

        context: {
          email: email,
          verificationType: "email",
          otpSent: true,
        },
      });
    }
    // create a new user
    await this.usersService.update(userId, {
      email: email,
      brandId: brandId,
    });
    user.email = email;
    user.brandId = brandId;
    // }
    // Check if the email is already associated with the user
    await this.otpVerificationService.checkOtpLimit(user.id, "email");
    // generate otp
    const otp = isUATServices
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();
    await this.otpVerificationService.createOtp({
      userId: user.id,
      otpCode: otp,
      type: "email",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    const templateName = "otp-verification";

    const data = {
      brandName: brand.name,
      otp: otp, // OTP code
      expiryTime: "10 minutes", // OTP expiration time
      year: _dayjs().year(), // Current year
    };

    if (isUATServices) {
      this.logger.log(`OTP for ${email} is ${otp}`);
      return {
        ...user,
        email: email,
      };
    }

    const basePath = this.isDev
      ? path.join(process.cwd(), "src", "templates", "web", "ejs")
      : path.join(process.cwd(), "src", "templates", "web", "ejs");

    const templatePath = path.join(basePath, `${templateName}.ejs`);
    const htmlContent = await ejs.renderFile(templatePath, data);
    // send email
    await this.emailService.sendEmail({
      to: user.email,
      name: "User", // Default to "User" if name is not provided
      subject: `OTP Verification for ${brand.name}`,
      html: htmlContent,
    });

    return {
      ...user,
      email: email,
    };
  }

  /**
   *
   * @param phoneNumber
   * @param brandId
   * @param domain
   * @param version
   * @returns
   */
  async sendPhone(
    phoneNumber: string,
    brandId: string,
    domain: string,
    version?: string,
  ) {
    if (!phoneNumber || !brandId) {
      throw new BadRequestException("Invalid request");
    }
    // Check if the user exists
    let user = await this.usersService.findByPhoneOrEmail({
      phoneNumber,
      brandId,
      type: "phone",
    });
    if (version === "2" && !user?.id) {
      throw new BadRequestException("No account found please signup");
    }

    if (user && !user.isPhoneVerified && version === "2") {
      throw new BadRequestException("No account found please signup");
    }

    if (!user?.id) {
      // create a new user
      const brandSubDomain = await this.prisma.brand_sub_domains.findFirst({
        where: {
          subdomain: domain,
          brandId: brandId,
        },
        select: {
          id: true,
        },
      });
      // fetch brand config
      const brandConfig = await this.prisma.brandConfig.findFirst({
        where: { brandId: brandId },
        select: {
          user_auto_allocation: true,
          loan_auto_allocation: true,
        },
      });
      if (!brandSubDomain) {
        throw new BadRequestException("Brand not found");
      }
      user = await this.usersService.createUser(
        {
          phoneNumber: phoneNumber,
          brandId: brandId,
          email: null,
          brandSubDomainId: brandSubDomain.id,
        },
        brandConfig.user_auto_allocation,
        brandConfig.loan_auto_allocation,
      );
      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: user.id,
        message: `Phone OTP sent to ${phoneNumber}`,
        type: "PhoneVerification",
        brandId: brandId,
        platformType: platform_type.WEB,

        context: {
          phoneNumber: phoneNumber,
          verificationType: "phone",
          otpSent: true,
          isNewUser: !user.isPhoneVerified,
        },
      });
    }
    const brand = await this.prisma.brand.findUnique({
      where: {
        id: brandId,
      },
    });

    const isUATServices =
      brand?.isUATServices || phoneNumber === "+918888899999";
    if (user.brandId !== brandId) {
      throw new BadRequestException("Invalid brandId");
    }
    // Check if the email is already associated with the user
    await this.otpVerificationService.checkOtpLimit(user.id, "phone");
    // generate otp
    const otp = isUATServices
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();
    await this.otpVerificationService.createOtp({
      userId: user.id,
      otpCode: otp,
      type: "phone",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });
    // is UAT service, log the otp and return
    if (brand && brand.id && isUATServices) {
      this.logger.log(`OTP for ${phoneNumber} is ${otp}`);
      return user;
    }
    await this.smsService.sendSms({
      text: `Your OTP code is ${otp}`,
      to: user.phoneNumber,
      otp: otp,
      name: "",
    });
    return user;
  }

  /**
   * Send OTP via phone or email for login (v2 only)
   * @param phoneNumber - User's phone number (optional)
   * @param email - User's email (optional)
   * @param brandId - Brand ID
   * @param domain - Domain (not used, kept for API consistency)
   * @returns User object
   */
  async sendPhoneOrEmail(
    phoneNumber: string,
    email: string,
    brandId: string,
    domain: string,
  ) {
    if (!phoneNumber && !email) {
      throw new BadRequestException(
        "Either phone number or email must be provided",
      );
    }
    if (!brandId) {
      throw new BadRequestException("Invalid brandId");
    }

    let user: User | null = null;
    let verificationType: "phone" | "email" = "phone";

    // Try to find user by phone first
    if (phoneNumber) {
      user = await this.usersService.findByPhoneOrEmail({
        phoneNumber,
        brandId,
        type: "phone",
      });
      verificationType = "phone";
    }

    // If not found by phone, try email
    if (!user?.id && email) {
      if (!user?.isEmailVerified) {
        throw new BadRequestException(
          "no account found please try with phone number or continue with signup",
        );
      }
      user = await this.usersService.findByPhoneOrEmail({
        email,
        brandId,
        type: "email",
      });
      verificationType = "email";
    }

    // User must exist
    if (!user?.id) {
      throw new BadRequestException("No account found please signup");
    }

    // Check if user is verified for the channel they're using
    if (verificationType === "phone" && !user.isPhoneVerified) {
      throw new BadRequestException("No account found please signup");
    }

    if (verificationType === "email" && !user.isEmailVerified) {
      throw new BadRequestException("No account found please signup");
    }

    if (user.brandId !== brandId) {
      throw new BadRequestException("Invalid brandId");
    }

    const brand = await this.prisma.brand.findUnique({
      where: {
        id: brandId,
      },
    });

    if (!brand) {
      throw new BadRequestException("Brand not found");
    }

    const isUATServices =
      brand?.isUATServices ||
      phoneNumber === "+918888899999" ||
      email === "testUser@qualoan.com";

    // Check OTP limit for the verification type
    await this.otpVerificationService.checkOtpLimit(user.id, verificationType);

    // Generate OTP
    const otp = isUATServices
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();

    await this.otpVerificationService.createOtp({
      userId: user.id,
      otpCode: otp,
      type: verificationType,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Log the action
    const contactInfo = verificationType === "phone" ? phoneNumber : email;
    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: user.id,
      message: `${verificationType === "phone" ? "Phone" : "Email"} OTP sent to ${contactInfo}`,
      type:
        verificationType === "phone"
          ? "PhoneVerification"
          : "EmailVerification",
      brandId: brandId,
      platformType: platform_type.WEB,

      context: {
        [verificationType === "phone" ? "phoneNumber" : "email"]: contactInfo,
        verificationType: verificationType,
        otpSent: true,
      },
    });

    // If UAT service, log and return
    if (isUATServices) {
      this.logger.log(`[UAT] OTP for ${contactInfo} is ${otp}`);
      return user;
    }

    // Send OTP via SMS or Email
    if (verificationType === "phone") {
      await this.smsService.sendSms({
        text: `Your OTP code is ${otp}`,
        to: user.phoneNumber,
        otp: otp,
        name: "",
      });
    } else {
      const templateName = "otp-verification";
      const data = {
        brandName: brand.name,
        otp: otp,
        expiryTime: "10 minutes",
        year: _dayjs().year(),
      };

      const basePath = this.isDev
        ? path.join(process.cwd(), "src", "templates", "web", "ejs")
        : path.join(process.cwd(), "src", "templates", "web", "ejs");

      const templatePath = path.join(basePath, `${templateName}.ejs`);
      const htmlContent = await ejs.renderFile(templatePath, data);

      await this.emailService.sendEmail({
        to: user.email,
        name: "User",
        subject: `OTP Verification for ${brand.name}`,
        html: htmlContent,
      });
    }

    return user;
  }

  /**
   * Validate signup form fields with early exit
   * @param phoneNumber - User's phone number
   * @param email - User's email
   * @param panCard - User's PAN card
   * @throws BadRequestException for invalid inputs
   */

  private validateSignupInputs(phoneNumber: string, panCard: string): string {
    // Early exit on missing required fields
    if (!phoneNumber || !panCard) {
      throw new BadRequestException("Invalid request: Missing required fields");
    }

    // Normalize and validate phone number
    // Remove all non-digit characters
    const phoneDigits = phoneNumber.replace(/\D/g, "");

    let normalizedPhone: string;

    if (phoneDigits.length === 10 && /^[6-9]\d{9}$/.test(phoneDigits)) {
      // Valid 10-digit number, prefix +91
      normalizedPhone = `+91${phoneDigits}`;
    } else if (phoneDigits.length === 12 && phoneDigits.startsWith("91")) {
      // Already has country code without '+'
      normalizedPhone = `+${phoneDigits}`;
    } else if (/^\+91[6-9]\d{9}$/.test(phoneNumber)) {
      // Already correctly formatted with +91
      normalizedPhone = phoneNumber;
    } else {
      throw new BadRequestException(
        "Invalid phone number format. Must include +91 or be a valid 10-digit Indian mobile number.",
      );
    }

    // Validate PAN format (5 letters + 4 digits + 1 letter)
    const panUpperCase = panCard.toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpperCase)) {
      throw new BadRequestException(
        "Invalid PAN card format. Format: 5 uppercase letters + 4 digits + 1 uppercase letter",
      );
    }

    return normalizedPhone;
  }

  /**
   * Send OTP for signup with full form data (v2) - OPTIMIZED
   * @param signupPayload - Form data including phoneNumber, email, currentStatus, monthlySalary, paymentMethod, panCard
   * @param brandId - Brand ID
   * @param domain - Domain
   * @returns User object
   */
  async sendSignupOtpV2(
    signupPayload: {
      phoneNumber: string;
      occupationTypeId: string;
      monthlySalary: string;
      panCard: string;
    },
    brandId: string,
    domain: string,
  ) {
    const { phoneNumber, occupationTypeId, monthlySalary, panCard } =
      signupPayload;

    // Validate inputs and get normalized phone
    const normalizedPhone = this.validateSignupInputs(phoneNumber, panCard);
    const panCardUpper = panCard.toUpperCase();

    // Validate additional fields
    if (!occupationTypeId || !monthlySalary) {
      throw new BadRequestException(
        "Current status and monthly salary are required",
      );
    }

    const salaryNumber = parseInt(monthlySalary);
    if (isNaN(salaryNumber) || salaryNumber <= 0) {
      throw new BadRequestException("Invalid monthly salary");
    }

    if (!brandId) {
      throw new BadRequestException("Invalid brandId");
    }

    const [existingUser, existingPan, brand, brandConfig, brandSubDomain] =
      await Promise.all([
        // Use normalized phone number
        this.usersService.findByPhoneOrEmail({
          phoneNumber: normalizedPhone,
          brandId,
          type: "phone",
        }),
        this.prisma.document.findFirst({
          where: {
            documentNumber: panCardUpper,
            type: DocumentTypeEnum.PAN,
            user: {
              brandId: brandId,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true,
                isPhoneVerified: true,
                brandId: true,
              },
            },
          },
        }),
        this.prisma.brand.findUnique({
          where: { id: brandId },
        }),
        this.prisma.brandConfig.findFirst({
          where: { brandId: brandId },
        }),
        this.prisma.brand_sub_domains.findFirst({
          where: {
            subdomain: domain,
            brandId: brandId,
          },
          select: { id: true },
        }),
      ]);

    const isUATServices =
      brand?.isUATServices || phoneNumber === "+918888899999";
    if (!brand) {
      throw new BadRequestException("Brand not found");
    }

    if (!brandSubDomain) {
      throw new BadRequestException("Brand subdomain not found");
    }

    // Clearer user verification logic
    if (existingUser?.isPhoneVerified) {
      throw new BadRequestException(
        "Phone number already associated with another customer please signin to continue",
      );
    }
    if (existingPan?.user?.isPhoneVerified) {
      const phone = existingPan.user.phoneNumber;
      const last4 = phone.slice(-4);

      const message = `This PAN is already linked to another account. Please sign in using the phone number ending in ****${last4}.`;

      throw new BadRequestException(
        message ||
          `PAN already associated with another customer please signin to continue phone number  ${existingPan.user.phoneNumber}`,
      );
    }
    if (existingUser && existingPan && existingUser.id !== existingPan.userId) {
      throw new BadRequestException(
        "Phone number and PAN already associated with another customer please signin to continue",
      );
    }
    if (existingPan && existingPan.user.isPhoneVerified) {
      const phone = existingPan.user.phoneNumber;
      const last4 = phone.slice(-4);

      const message = `This PAN is already linked to another account. Please sign in using the phone number ending in ****${last4}.`;

      throw new BadRequestException(
        message ||
          `PAN already associated with another customer please signin to continue phone number  ${existingPan.user.phoneNumber}`,
      );
    }

    // Determine which user to use
    let user = existingUser;

    if (!user && existingPan?.user) {
      user = existingPan.user;
    }

    // Create or update user
    if (user?.id) {
      await this.usersService
        .update(user.id, {
          phoneNumber: normalizedPhone, // Use normalized phone
          brandId: brandId,
        })
        .catch((err) => {
          this.logger.warn(`Failed to update user ${user.id}: ${err.message}`);
        });
    } else {
      user = await this.usersService.createUser(
        {
          phoneNumber: normalizedPhone,
          brandId: brandId,
          occupation_type_id: BigInt(occupationTypeId),
          brandSubDomainId: brandSubDomain.id,
        },
        brandConfig.user_auto_allocation,
        brandConfig.loan_auto_allocation,
      );
    }

    await this.otpVerificationService.checkOtpLimit(user.id, "phone");

    const otp = isUATServices
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();
    const isSalaryExceedsBase =
      brandConfig && salaryNumber > brandConfig.salaryThresholdAmount;
    await Promise.all([
      this.otpVerificationService.createOtp({
        userId: user.id,
        otpCode: otp,
        type: "phone",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }),
      this.storeUserAdditionalData(
        user.id,
        isSalaryExceedsBase,
        salaryNumber.toString(), // Ensure it's valid
        existingPan?.id,
        panCardUpper,
      ).catch((err) => {
        this.logger.warn(
          `Failed to store user details for user ${user.id}: ${err.message}`,
        );
      }),
    ]);
    if (panCardUpper) {
      await this.prisma.document.deleteMany({
        where: {
          documentNumber: panCardUpper,
          type: DocumentTypeEnum.PAN,
          userId: {
            not: user.id,
          },
          user: {
            brandId: brandId,
          },
        },
      });
    }
    // Create audit log (async)
    this.awsAuditLogsSqsService
      ?.sendToAuditLogsQueue({
        userId: user.id,
        message: `Phone OTP sent to ${normalizedPhone} during signup`, // Use normalized phone
        type: "PhoneVerification",
        brandId: brandId,
        platformType: platform_type.WEB,

        context: {
          phoneNumber: normalizedPhone, // Use normalized phone
          panCard: panCardUpper,
          occupationTypeId: occupationTypeId,
          monthlySalary: monthlySalary,
          verificationType: "phone",
          otpSent: true,
          isNewUser: !user.isPhoneVerified,
        },
      })
      .catch((err) => {
        this.logger.error(
          `Failed to send audit log to queue for user ${user.id}: ${err.message}`,
        );
      });

    if (isUATServices) {
      this.logger.log(`[UAT] OTP for ${normalizedPhone}: ${otp}`);
      return {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isPhoneVerified: user.isPhoneVerified,
        brandId: user.brandId,
      };
    }

    // Send SMS (async)
    this.smsService
      .sendSms({
        text: `Your OTP code is ${otp}. Valid for 10 minutes.`,
        to: user.phoneNumber,
        otp: otp,
        name: "",
      })
      .catch((err) => {
        this.logger.error(
          `Failed to send SMS to ${user.phoneNumber}: ${err.message}`,
        );
      });

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      isPhoneVerified: user.isPhoneVerified,
      brandId: user.brandId,
    };
  }

  /**
   * Store additional user data (helper method for sendSignupOtpV2)
   * Runs in background to not block response
   */
  private async storeUserAdditionalData(
    userId: string,
    isSalaryExceedsBase: boolean,
    monthlySalary: string,
    existingPanId?: string,
    panCardUpper?: string,
  ): Promise<void> {
    try {
      await Promise.all([
        this.prisma.employment.upsert({
          where: { userId: userId },
          update: {
            salaryExceedsBase: isSalaryExceedsBase,
            salary: parseInt(monthlySalary),
          },
          create: {
            userId: userId,
            salary: parseInt(monthlySalary),
            salaryExceedsBase: isSalaryExceedsBase,
          },
        }),
        existingPanId && panCardUpper
          ? this.prisma.document.update({
              where: { id: existingPanId },
              data: { userId: userId },
            })
          : this.prisma.document.upsert({
              where: {
                userId_type: {
                  userId: userId,
                  type: DocumentTypeEnum.PAN,
                },
              },
              update: {
                documentNumber: panCardUpper,
                updatedAt: new Date(),
              },
              create: {
                userId: userId,
                updatedAt: new Date(),
                createdAt: new Date(),
                documentNumber: panCardUpper,
                type: DocumentTypeEnum.PAN,
                status: "PENDING",
                userDataStatus: "NOT_VERIFIED",
              },
            }),
      ]);
    } catch (err) {
      throw err;
    }
  }

  /**
   *
   * @param otp
   * @param type
   * @param brandId
   * @param userId
   * @returns
   */
  async verifyOtp(res: Response, verifyOtpDto: VerifyOtpDto, version?: string) {
    const { otp, type, brandId, userId, deviceId } = verifyOtpDto;
    if (!otp || !type || !brandId || !userId) {
      throw new BadRequestException("Invalid request");
    }
    const user = await this.usersService.findOne(userId, {
      userDetails: {
        select: {
          id: true,
        },
      },
      documents: {
        where: {
          type: DocumentTypeEnum.PAN,
          status: "PENDING",
          documentNumber: { not: null },
        },
      },
      employment: true,
    });
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        brandConfig: {
          select: {
            salaryThresholdAmount: true,
            user_auto_allocation: true,
          },
        },
      },
    });
    if (!brand) {
      throw new BadRequestException("Brand not found");
    }

    // Check if the user exists
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Check if the user has a verified phone number
    await this.otpVerificationService.verifyOtp({ userId, otpCode: otp, type });

    // Update verification flags if necessary
    const updatePayload: Partial<User> = {};
    if (type === "phone" && !user.isPhoneVerified) {
      if (user.documents.length > 0) {
        try {
          await this.kycService.pan(user.id, {
            documentNumber: user.documents[0].documentNumber,
            type: DocumentTypeEnum.PAN,
            frontDocumentUrl: "",
            backDocumentUrl: "",
          });
        } catch (err) {
          this.logger.error(
            `Failed to auto-verify PAN for user ${user.id}: ${err}`,
          );
        }
      }

      updatePayload.isPhoneVerified = true;
      user.isPhoneVerified = true;
      user.isActive = true;
      user.phoneVerifiedAt = new Date();
      updatePayload.phoneVerifiedAt = new Date();
      updatePayload.isActive = true;
    } else if (type === "email" && !user.isEmailVerified) {
      updatePayload.isEmailVerified = true;
      user.isEmailVerified = true;
      user.isActive = true;
      user.emailVerifiedAt = new Date();
      updatePayload.emailVerifiedAt = new Date();
      updatePayload.isActive = true;
    }
    
    if (
      user.isEmailVerified &&
      user.isPhoneVerified &&
      user.onboardingStep < 3
    ) {
      if (version === "2") {
        updatePayload.onboardingStep = 7;
        user.onboardingStep = 7;
      } else {
        updatePayload.onboardingStep = 3;
        user.onboardingStep = 3;
      }
    } else if (
      user.isPhoneVerified &&
      !user.isEmailVerified &&
      user.onboardingStep < 2
    ) {
      updatePayload.onboardingStep = 2;
      user.onboardingStep = 2;
    }

    // If the user is not verified, set the onboarding step to 1
    if (Object.keys(updatePayload).length > 0) {
      await this.usersService.update(user.id, updatePayload);
    }
    if (type === "email") {
      return user;
    }
    if (version === "2") {
      await this.usersService.validateBlocklists(
        user.id,
        user.brandId,
        user.documents,
        user,
        user.employment,
        user.userDetails,
        brand.brandConfig,
      );
    }
    const tokens = await this.loginTokenService.createTokens(
      user.id,
      null,
      user.email || null,
      deviceId,
      brandId,
      platform_type.WEB,
    );
    res.cookie("refresh-token", tokens.refreshToken, {
      httpOnly: true,
      secure: false, // should be true in production with HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return {
      user: {
        id: user?.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        onboardingStep: user.onboardingStep,
        isEmailVerified: user.isEmailVerified,
        brandId: user.brandId,
        isPhoneVerified: user.isPhoneVerified,
        googleId: user.googleId,
        isWhatsappVerified: user.isWhatsappVerified,
        employmentId: user.employment?.id,
        userDetailsId: user.userDetails?.id,
      },
      accessToken: tokens.accessToken,
    };
  }

  /**
   *
   * @param googleLoginDto
   * @returns
   */
  async validateGoogleToken(googleLoginDto: GoogleLoginDto, version?: string) {
    const { credentials, brandId, deviceId, userId } = googleLoginDto;

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credentials,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw new UnauthorizedException("Invalid Google token");
    }

    const { email, sub: googleId } = payload;
    // check if email already exists with the different user
    const userEmail = await this.usersService.findByPhoneOrEmail({
      email,
      brandId,
      type: "email",
    });
    if (userEmail && userEmail?.id !== userId) {
      // If the email is already associated with the user, return the user
      throw new BadRequestException(
        "Email already associated with another user",
      );
    }
    if (!email || !googleId) {
      throw new BadRequestException("Invalid Google token payload");
    }
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }
    if (!user.email && email) {
      await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
        userId: user.id,
        message: `User logged in via Google`,
        type: "EmailVerification",
        brandId: brandId,
        platformType: platform_type.WEB,
        context: {
          email: email,
          googleId: googleId,
          verificationType: "google",
          isEmailVerified: true,
          onboardingStep: 3,
          deviceId: deviceId,
        },
      });
      // try {
      //   const steps = [2, 3]; // Your step numbers

      //   for (const stepNumber of steps) {
      //     await this.prisma.onboardingJourney.upsert({
      //       where: {
      //         userId_stepNumber: {
      //           userId: user.id,
      //           stepNumber,
      //         },
      //       },
      //       update: {
      //         brandId: user.brandId,
      //         createdAt: new Date(Date.now() + stepNumber * 60 * 1000), // 1 minute per step
      //       },
      //       create: {
      //         userId: user.id,
      //         stepNumber,
      //         brandId: user.brandId,
      //         createdAt: new Date(Date.now() + stepNumber * 60 * 1000), // 1 minute per stepre
      //         reason:
      //           stepNumber === 2
      //             ? "Email added during Google login"
      //             : "application steps reviewed",
      //       },
      //     });
      //   }
      // } catch (err) {
      //   console.error(
      //     `Failed to update onboarding journey: ${err.message}`,
      //     err.stack,
      //   );
      // }
    }
    const updatedUser = await this.usersService.update(user.id, {
      brandId: brandId,
      isEmailVerified: true,
      email: email,
      googleId: googleId,
      onboardingStep: version === "2" ? 7 : 3,
    });

    return updatedUser;
  }

  /**
   *
   * @param googleLoginDto
   * @returns
   */
  async refreshAccessToken(refreshToken: string, domain: string) {
    if (!refreshToken) {
      throw new BadRequestException("Invalid refresh token");
    }
    if (!domain) {
      throw new BadRequestException("Invalid domain");
    }
    // Check if the user exists
    const tokens = await this.loginTokenService.refreshTokens(
      refreshToken,
      platform_type.WEB,
      domain,
    );

    return tokens;
  }

  /**
   *
   * @param brandId
   * @param userId
   */
  async userLogout(brandId: string, userId: string) {
    await this.loginTokenService.revokeWebTokens(userId);
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { InitialDetailsDto } from "../dto/initial-details.dto";
import { PanDetailsPlusService } from "../../panDetailsPlus/panDetailsPlus.service";
import { SmsService } from "../../../core/communication/services/sms.service";
import { AwsAuditLogsSqsService } from "../../../core/aws/sqs/aws-audit-logs-sqs.service";
import * as crypto from "crypto";
import { UserStatusEnum } from "src/constant/enum";

@Injectable()
export class InitialDetailsService {
  private readonly logger = new Logger(InitialDetailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly panDetailsPlusService: PanDetailsPlusService,
    private readonly smsService: SmsService,
    private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
  ) {}

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Normalize phone number to always include +91
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or special characters
    let normalized = phone.replace(/[\s\-()]/g, "");

    // If it starts with 91 (Meta format), add +
    if (normalized.startsWith("91") && normalized.length === 12) {
      return "+" + normalized;
    }

    // If it doesn't start with +, add +91
    if (!normalized.startsWith("+")) {
      return "+91" + normalized;
    }

    return normalized;
  }

  async processInitialDetails(
    data: InitialDetailsDto,
    brandId: string,
    whatsappPhone: string,
  ): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    phoneNumber: string;
    nextScreen: string;
    panData?: any;
  }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(whatsappPhone);

      // Check if phone number already exists
      const existingUserByPhone = await this.prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone },
        include: { documents: { where: { type: "PAN" } } },
      });

      // Check if PAN already exists
      const existingPAN = await this.prisma.document.findFirst({
        where: {
          type: "PAN",
          documentNumber: data.pan_card.toUpperCase(),
        },
        include: { user: true },
      });

      // Validate conflicts - only for phone verified users
      if (existingUserByPhone && existingPAN) {
        if (existingUserByPhone.id !== existingPAN.userId) {
          // Only show conflict if BOTH users are phone verified
          if (
            existingUserByPhone.isPhoneVerified &&
            existingPAN.user.isPhoneVerified
          ) {
            throw new ConflictException(
              "Phone number and PAN card are registered with different accounts",
            );
          }
        }
        // Only show "already registered" if phone is verified
        if (existingUserByPhone.isPhoneVerified) {
          throw new ConflictException("You have already registered.");
        }
      } else if (existingUserByPhone) {
        const userPAN = existingUserByPhone.documents.find(
          (doc) => doc.type === "PAN",
        );
        if (
          userPAN &&
          userPAN.documentNumber !== data.pan_card.toUpperCase() &&
          existingUserByPhone.isPhoneVerified
        ) {
          throw new ConflictException(
            "Phone number is already registered with a different PAN card",
          );
        }
      } else if (existingPAN) {
        // Only show PAN conflict if the existing PAN user has verified phone
        if (existingPAN.user.isPhoneVerified) {
          throw new ConflictException(
            "PAN card is already registered with a different phone number",
          );
        }
      }

      let userId: string;
      let isNewUser = false;

      if (existingUserByPhone) {
        userId = existingUserByPhone.id;

        if (!existingUserByPhone.brandId && brandId) {
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              brandId,
              status_id:
                data.employment_status === "salaried"
                  ? UserStatusEnum.PENDING
                  : UserStatusEnum.BLOCKED,
            },
          });
        }
        // Update employment/salary (upsert for re-journey support)
        await this.prisma.employment.upsert({
          where: { userId },
          update: {
            salary: parseInt(data.monthly_salary, 10),
            employmenttype:
              data.employment_status === "salaried" ? "FULL_TIME" : "FREELANCE",
          },
          create: {
            userId,
            salary: parseInt(data.monthly_salary, 10),
            employmenttype:
              data.employment_status === "salaried" ? "FULL_TIME" : "FREELANCE",
          },
        });

        // Update PAN if user is not verified and PAN is different
        const userPAN = existingUserByPhone.documents.find(
          (doc) => doc.type === "PAN",
        );
        if (
          !existingUserByPhone.isPhoneVerified &&
          userPAN &&
          userPAN.documentNumber !== data.pan_card.toUpperCase()
        ) {
          await this.prisma.document.update({
            where: { id: userPAN.id },
            data: { documentNumber: data.pan_card.toUpperCase() },
          });
        } else if (!userPAN) {
          // Create PAN document if doesn't exist
          await this.prisma.document.create({
            data: {
              userId,
              type: "PAN",
              documentNumber: data.pan_card.toUpperCase(),
            },
          });
        }
      } else {
        isNewUser = true;
        const newUser = await this.prisma.user.create({
          data: {
            phoneNumber: normalizedPhone,
            brandId: brandId || null,
            isPhoneVerified: false,
            occupation_type_id: data.employment_status === "salaried" ? 1 : 2,
            status_id:
              data.employment_status === "salaried"
                ? UserStatusEnum.PENDING
                : UserStatusEnum.BLOCKED,
          },
        });

        userId = newUser.id;

        // // Create user status
        // await this.prisma.userStatus.create({
        //   data: {
        //     userId: userId,
        //     currentStatus:
        //       data.employment_status === "salaried"
        //         ? "SALARIED"
        //         : "SELF_EMPLOYED",
        //   },
        // });

        // Create employment record
        await this.prisma.employment.create({
          data: {
            userId: userId,
            salary: parseInt(data.monthly_salary, 10),
            employmenttype:
              data.employment_status === "salaried" ? "FULL_TIME" : "FREELANCE",
          },
        });

        // Create PAN document record
        await this.prisma.document.create({
          data: {
            userId: userId,
            type: "PAN",
            documentNumber: data.pan_card.toUpperCase(),
          },
        });
      }

      // Always verify PAN for unverified users (new users or existing unverified users)
      let panData = null;
      const shouldVerifyPAN =
        isNewUser || !existingUserByPhone?.isPhoneVerified;

      if (shouldVerifyPAN) {
        try {
          const panResponse =
            await this.panDetailsPlusService.verifyPanWithFallback(
              data.pan_card.toUpperCase(),
              userId,
              brandId,
              true,
            );
          if (panResponse?.success) {
            panData = {
              full_name: panResponse.name || "",
              first_name: panResponse.raw?.result?.first_name || "",
              middle_name: panResponse.raw?.result?.middle_name || "",
              last_name: panResponse.raw?.result?.last_name || "",
              dob: panResponse.dob || "",
              gender: panResponse.raw?.result?.gender || "",
              father_name: panResponse.fathersName || "",
              address_line1:
                panResponse.raw?.result?.address?.building_name || "",
              address_line2:
                panResponse.raw?.result?.address?.street_name || "",
              city: panResponse.raw?.result?.address?.city || "",
              state: panResponse.raw?.result?.address?.state || "",
              pincode: panResponse.raw?.result?.address?.pincode || "",
              full_address: panResponse.address || "",
            };
          } else {
            // PAN verification failed - return error to user
            return {
              success: false,
              message:
                "Invalid PAN details. Please check your PAN card number.",
              phoneNumber: normalizedPhone,
              nextScreen: "INITIAL_DETAILS",
            };
          }
        } catch (error) {
          this.logger.error(`PAN verification failed: ${error.message}`);
          // Return PAN error to user instead of continuing
          return {
            success: false,
            message: "Invalid PAN details. Please check your PAN card number.",
            phoneNumber: normalizedPhone,
            nextScreen: "INITIAL_DETAILS",
          };
        }
      }

      // Generate OTP for phone verification
      const otp = this.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Save OTP to database
      await this.prisma.userOtpVerification.create({
        data: {
          userId: userId,
          otpCode: otp,
          type: "phone",
          isUsed: false,
          expiresAt: expiresAt,
        },
      });

      this.logger.log(`OTP generated for user ${userId}`);

      await this.smsService.sendSms({
        to: normalizedPhone,
        text: `Your OTP code is ${otp}`,
        otp: otp,
        name: "",
      });

      // Log audit
      if (this.awsAuditLogsSqsService) {
        await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
          userId: userId,
          brandId: brandId,
          message: "User submitted initial details via WhatsApp",
          type: "InitialDetails",
          platformType: "WHATSAPP",
          context: {
            step: "INITIAL_DETAILS",
            phoneNumber: normalizedPhone,
          },
        });
      }

      return {
        success: true,
        message: isNewUser
          ? "Account created successfully. OTP sent to your phone."
          : "OTP sent to your phone.",
        userId: userId,
        phoneNumber: normalizedPhone,
        nextScreen: "OTP_VERIFICATION",
        panData: panData || {}, // Ensure panData is always an object
      };
    } catch (error) {
      this.logger.error("Error processing initial details:", error);
      throw error;
    }
  }

  /**
   * Get employment types for dropdown
   */
  async getEmploymentTypes() {
    return [
      { id: "salaried", title: "Salaried" },
      { id: "self_employed", title: "Self Employed" },
    ];
  }

  /**
   * Resend OTP for phone verification
   */
  async resendOtp(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Find user by phone number
      const user = await this.prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found. Please start registration again.",
        };
      }

      if (user.isPhoneVerified) {
        return {
          success: false,
          message: "Phone number is already verified.",
        };
      }

      // Check resend limit (3 times per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const resendCount = await this.prisma.userOtpVerification.count({
        where: {
          userId: user.id,
          type: "phone",
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (resendCount >= 3) {
        return {
          success: false,
          message:
            "Maximum OTP resend limit reached. Please try again tomorrow.",
        };
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Mark previous OTPs as used
      await this.prisma.userOtpVerification.updateMany({
        where: {
          userId: user.id,
          type: "phone",
          isUsed: false,
        },
        data: { isUsed: true },
      });

      // Create new OTP
      await this.prisma.userOtpVerification.create({
        data: {
          userId: user.id,
          otpCode: otp,
          type: "phone",
          isUsed: false,
          expiresAt: expiresAt,
        },
      });

      this.logger.log(`OTP resent for user ${user.id}`);

      await this.smsService.sendSms({
        to: normalizedPhone,
        text: `Your OTP code is ${otp}`,
        otp: otp,
        name: "",
      });

      return {
        success: true,
        message: "OTP sent to your phone.",
      };
    } catch (error) {
      this.logger.error("Error resending OTP:", error);
      return {
        success: false,
        message: "Failed to resend OTP. Please try again.",
      };
    }
  }
}

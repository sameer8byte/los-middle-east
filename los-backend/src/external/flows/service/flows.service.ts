import { Injectable, Logger } from '@nestjs/common';
import { DecryptedDataDto } from '../dto/decrypted-data.dto';
import { InitialDetailsService } from './initial-details.service';
import { BankAccountService } from './bank-account.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { InitialDetailsDto } from '../dto/initial-details.dto';
import { BankAccountDto } from '../dto/bank-account.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { OtpVerificationService } from '../../../shared/otpVerification/otp-verification.service';
import { AccountAggregatorService } from '../../aa/aa.service';
import { checkAAEligibilityByIFSC } from '../../../utils/aa-eligibility.util';
import { AwsAuditLogsSqsService } from '../../../core/aws/sqs/aws-audit-logs-sqs.service';

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    private readonly initialDetailsService: InitialDetailsService,
    private readonly bankAccountService: BankAccountService,
    private readonly otpVerificationService: OtpVerificationService,
    private readonly prisma: PrismaService,
    private readonly aaService: AccountAggregatorService,
    private readonly whatsappTemplateService: WhatsAppTemplateService,
    private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
  ) {}

  private employmentTypes = [
    { id: 'salaried', title: 'Salaried' },
    { id: 'self_employed', title: 'Self Employed' },
  ];

  private brandIdCache: string | null = null;

  private async trackOnboardingStep(
    userId: string,
    brandId: string,
    stepNumber: number,
    reason: string,
  ): Promise<void> {
    try {
      await this.prisma.onboardingJourney.upsert({
        where: {
          userId_stepNumber: {
            userId,
            stepNumber,
          },
        },
        update: {
          updatedAt: new Date(),
        },
        create: {
          userId,
          stepNumber,
          brandId,
          reason,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to track onboarding step ${stepNumber} for user ${userId}: ${error.message}`,
      );
    }
  }

  private async getBrandId(): Promise<string | null> {
    if (this.brandIdCache !== null) {
      return this.brandIdCache;
    }
    const brand = await this.prisma.brand.findFirst({
      where: { onPartner: true },
      select: { id: true },
    });
    this.brandIdCache = brand?.id || null;
    return this.brandIdCache;
  }

  async handlePing(decryptedData: DecryptedDataDto): Promise<any> {
    return {
      version: decryptedData.version,
      data: { status: 'active' },
    };
  }

  async handleInit(decryptedData: DecryptedDataDto): Promise<any> {
    return {
      version: decryptedData.version,
      screen: 'INITIAL_DETAILS',
      next: { name: 'INITIAL_DETAILS' },
      data: {
        employment_types: this.employmentTypes,
      },
    };
  }

  async handleDataExchange(decryptedData: DecryptedDataDto): Promise<any> {
    const screen = decryptedData.screen;
    
    switch (screen) {
      case 'INITIAL_DETAILS':
        return this.handleInitialDetailsSubmit(decryptedData);
      case 'OTP_VERIFICATION':
        return this.handleOtpVerificationSubmit(decryptedData);
      case 'EMAIL_DETAILS':
        return this.handleEmailDetailsSubmit(decryptedData);
      case 'BANK_ACCOUNT':
        return this.handleBankAccountSubmit(decryptedData);
      default:
        return {
          version: decryptedData.version,
          screen: 'INITIAL_DETAILS',
          next: { name: 'INITIAL_DETAILS' },
          data: {
            error_message: `Unknown screen: ${screen}`,
            employment_types: this.employmentTypes,
          },
        };
    }
  }

  private async handleInitialDetailsSubmit(decryptedData: DecryptedDataDto): Promise<any> {
    try {
      // Get WhatsApp phone number from decryptedData
      const whatsappPhone = decryptedData.phone_number;
      
      this.logger.log(`Processing initial details - Phone: ${whatsappPhone ? 'Present' : 'Missing'}, Flow Token: ${decryptedData.flow_token}`);
      
      if (!whatsappPhone) {
        this.logger.error(`Phone number missing from session for token: ${decryptedData.flow_token}.server restart.`);
        return {
          version: decryptedData.version,
          screen: 'INITIAL_DETAILS',
          next: { name: 'INITIAL_DETAILS' },
          data: {
            error_message: 'Session expired. Please send "hi" again to restart.',
            employment_types: this.employmentTypes,
          },
        };
      }

      // Normalize PAN card to uppercase
      if (decryptedData.data?.pan_card) {
        decryptedData.data.pan_card = decryptedData.data.pan_card.toUpperCase();
      }
      
      const initialDetailsDto = plainToClass(InitialDetailsDto, decryptedData.data);
      const errors = await validate(initialDetailsDto);
      
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return {
          version: decryptedData.version,
          screen: 'INITIAL_DETAILS',
          next: { name: 'INITIAL_DETAILS' },
          data: {
            error_message: errorMessages.join(', '),
            employment_types: this.employmentTypes,
          },
        };
      }

      const brandId = await this.getBrandId();
      const result = await this.initialDetailsService.processInitialDetails(initialDetailsDto, brandId, whatsappPhone) as {
        success: boolean;
        message: string;
        userId?: string;
        phoneNumber: string;
        nextScreen: string;
        panData?: any;
      };

      if (result.success) {
        return {
          version: decryptedData.version,
          screen: 'OTP_VERIFICATION',
          next: { name: 'OTP_VERIFICATION' },
          data: {
            phone_number: result.phoneNumber,
            otp_sent_message: result.message,
            pan_data: result.panData,
          },
        };
      }

      return {
        version: decryptedData.version,
        screen: 'INITIAL_DETAILS',
        next: { name: 'INITIAL_DETAILS' },
        data: {
          error_message: result.message,
          employment_types: this.employmentTypes,
        },
      };
    } catch (error) {
      this.logger.error('Error in handleInitialDetailsSubmit:', error);
      return {
        version: decryptedData.version,
        screen: 'INITIAL_DETAILS',
        next: { name: 'INITIAL_DETAILS' },
        data: {
          error_message: error.message || 'An error occurred while processing your request',
          employment_types: this.employmentTypes,
        },
      };
    }
  }

  private async handleOtpVerificationSubmit(decryptedData: DecryptedDataDto): Promise<any> {
    try {
      const otpCode = decryptedData.data?.otp_code;
      const phoneNumber = decryptedData.data?.phone_number;
      
      // If OTP field is empty, undefined, or '0', treat as resend request
      if (!otpCode || otpCode.trim() === '' || otpCode === '0') {
        if (!phoneNumber) {
          return {
            version: decryptedData.version,
            screen: 'OTP_VERIFICATION',
            next: { name: 'OTP_VERIFICATION' },
            data: { error_message: 'Session expired. Please start again.' },
          };
        }

        const result = await this.initialDetailsService.resendOtp(phoneNumber);
        return {
          version: decryptedData.version,
          screen: 'OTP_VERIFICATION',
          next: { name: 'OTP_VERIFICATION' },
          data: {
            phone_number: phoneNumber,
            otp_sent_message: result.success ? `OTP resent to ${phoneNumber}` : '',
            pan_data: decryptedData.data?.pan_data || {},
            error_message: result.success ? '' : result.message,
          },
        };
      }
      
      // Validate OTP format
      if (!/^[0-9]{6}$/.test(otpCode)) {
        return {
          version: decryptedData.version,
          screen: 'OTP_VERIFICATION',
          next: { name: 'OTP_VERIFICATION' },
          data: { 
            phone_number: phoneNumber,
            pan_data: decryptedData.data?.pan_data || {},
            error_message: 'Please enter a valid 6-digit OTP' 
          },
        };
      }

      const otpRecord = await this.prisma.userOtpVerification.findFirst({
        where: {
          otpCode,
          isUsed: false,
          expiresAt: { gte: new Date() },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        return {
          version: decryptedData.version,
          screen: 'OTP_VERIFICATION',
          next: { name: 'OTP_VERIFICATION' },
          data: { 
            phone_number: phoneNumber,
            pan_data: decryptedData.data?.pan_data || {},
            error_message: 'Invalid or expired OTP' 
          },
        };
      }

      await this.otpVerificationService.verifyOtp({
        userId: otpRecord.userId,
        otpCode,
        type: otpRecord.type,
      });

      await this.prisma.user.update({
        where: { id: otpRecord.userId },
        data: { 
          isPhoneVerified: true, 
          phoneVerifiedAt: new Date(),
          onboardingStep: 2,
        },
      });

      // Track onboarding step 2
      await this.trackOnboardingStep(
        otpRecord.userId,
        otpRecord.user.brandId,
        2,
        'Phone verified via WhatsApp',
      );

      // Log audit
      if (this.awsAuditLogsSqsService) {
        await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
          userId: otpRecord.userId,
          brandId: otpRecord.user.brandId,
          message: 'User verified phone via WhatsApp',
          type: 'PhoneVerification',
          platformType: 'WHATSAPP',
          context: {
            step: 'OTP_VERIFICATION',
            phoneNumber: otpRecord.user.phoneNumber,
          },
        });
      }

      return {
        version: decryptedData.version,
        screen: 'EMAIL_DETAILS',
        next: { name: 'EMAIL_DETAILS' },
        data: {
          phone_number: phoneNumber,
        },
      };
    } catch (error) {
      this.logger.error('Error in OTP verification:', error);
      return {
        version: decryptedData.version,
        screen: 'OTP_VERIFICATION',
        next: { name: 'OTP_VERIFICATION' },
        data: { 
          phone_number: decryptedData.data?.phone_number,
          pan_data: decryptedData.data?.pan_data || {},
          error_message: error.message || 'OTP verification failed' 
        },
      };
    }
  }

  private async handleEmailDetailsSubmit(decryptedData: DecryptedDataDto): Promise<any> {
    try {
      const email = decryptedData.data?.email?.trim();
      const phoneNumber = decryptedData.data?.phone_number;

      if (!phoneNumber) {
        return {
          version: decryptedData.version,
          screen: 'EMAIL_DETAILS',
          next: { name: 'EMAIL_DETAILS' },
          data: { error_message: 'Session expired. Please start again.' },
        };
      }

      if (!email || email.length === 0) {
        return {
          version: decryptedData.version,
          screen: 'EMAIL_DETAILS',
          next: { name: 'EMAIL_DETAILS' },
          data: {
            phone_number: phoneNumber,
            error_message: 'Email is required',
          },
        };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
          version: decryptedData.version,
          screen: 'EMAIL_DETAILS',
          next: { name: 'EMAIL_DETAILS' },
          data: {
            phone_number: phoneNumber,
            error_message: 'Please enter a valid email address',
          },
        };
      }

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber },
      });

      if (!user) {
        return {
          version: decryptedData.version,
          screen: 'EMAIL_DETAILS',
          next: { name: 'EMAIL_DETAILS' },
          data: {
            phone_number: phoneNumber,
            error_message: 'User not found. Please start again.',
          },
        };
      }

      if (email) {
        const existingUser = await this.prisma.user.findFirst({
          where: {
            email,
            brandId: user.brandId,
            id: { not: user.id },
          },
        });

        if (existingUser) {
          return {
            version: decryptedData.version,
            screen: 'EMAIL_DETAILS',
            next: { name: 'EMAIL_DETAILS' },
            data: {
              phone_number: phoneNumber,
              error_message: 'Email already associated with another user',
            },
          };
        }

        await this.prisma.user.update({
          where: { id: user.id },
          data: { email, onboardingStep: 3 },
        });

        // Track onboarding step 3
        await this.trackOnboardingStep(
          user.id,
          user.brandId,
          3,
          'Email added via WhatsApp',
        );

        if (this.awsAuditLogsSqsService) {
          await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
            userId: user.id,
            brandId: user.brandId,
            message: 'User added email via WhatsApp',
            type: 'EmailAdded',
            platformType: 'WHATSAPP',
            context: { step: 'EMAIL_DETAILS', email },
          });
        }
      }

      return {
        version: decryptedData.version,
        screen: 'BANK_ACCOUNT',
        next: { name: 'BANK_ACCOUNT' },
        data: {
          phone_number: phoneNumber,
          account_types: await this.bankAccountService.getAccountTypes(),
        },
      };
    } catch (error) {
      this.logger.error('Error in email details:', error);
      return {
        version: decryptedData.version,
        screen: 'EMAIL_DETAILS',
        next: { name: 'EMAIL_DETAILS' },
        data: {
          phone_number: decryptedData.data?.phone_number,
          error_message: error.message || 'Failed to save email',
        },
      };
    }
  }

  private async handleBankAccountSubmit(decryptedData: DecryptedDataDto): Promise<any> {
    try {
      // Normalize IFSC code to uppercase
      if (decryptedData.data?.ifsc_code) {
        decryptedData.data.ifsc_code = decryptedData.data.ifsc_code.toUpperCase();
      }
      
      const bankAccountDto = plainToClass(BankAccountDto, decryptedData.data);
      const errors = await validate(bankAccountDto);
      
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return {
          version: decryptedData.version,
          screen: 'BANK_ACCOUNT',
          next: { name: 'BANK_ACCOUNT' },
          data: {
            error_message: errorMessages.join(', '),
            account_types: await this.bankAccountService.getAccountTypes(),
          },
        };
      }

      const phoneNumber = decryptedData.data?.phone_number;
      if (!phoneNumber) {
        return {
          version: decryptedData.version,
          screen: 'BANK_ACCOUNT',
          next: { name: 'BANK_ACCOUNT' },
          data: {
            error_message: 'Session expired. Please start again.',
            account_types: await this.bankAccountService.getAccountTypes(),
          },
        };
      }

      // Save bank account with penny drop verification
      const verificationResult = await this.bankAccountService.saveBankAccount(bankAccountDto, phoneNumber);

      // If verification failed, return error to user
      if (!verificationResult.success) {
        return {
          version: decryptedData.version,
          screen: 'BANK_ACCOUNT',
          next: { name: 'BANK_ACCOUNT' },
          data: {
            error_message: verificationResult.message,
            account_types: await this.bankAccountService.getAccountTypes(),
          },
        };
      }

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber },
      });

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { onboardingStep: 4 },
        });

        // Track onboarding step 4
        await this.trackOnboardingStep(
          user.id,
          user.brandId,
          4,
          'Bank account added via WhatsApp',
        );

        // Log audit
        if (this.awsAuditLogsSqsService) {
          await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
            userId: user.id,
            brandId: user.brandId,
            message: 'User submitted bank account via WhatsApp',
            type: 'BankAccount',
            platformType: 'WHATSAPP',
            context: {
              step: 'BANK_ACCOUNT',
              verificationStatus: verificationResult.verificationStatus,
            },
          });
        }
      }

      return {
        version: decryptedData.version,
        screen: 'COMPLETE',
        next: { name: 'COMPLETE' },
        data: {
          application_id: user?.formattedUserId || user?.id.substring(0, 8).toUpperCase() || 'N/A',
          phone_number: phoneNumber,
          verification_status: verificationResult.verificationStatus,
          account_holder_name: verificationResult.accountHolderName || bankAccountDto.account_name,
          success_message: verificationResult.message,
        },
      };
    } catch (error) {
      this.logger.error('Error in bank account:', error);
      return {
        version: decryptedData.version,
        screen: 'BANK_ACCOUNT',
        next: { name: 'BANK_ACCOUNT' },
        data: {
          error_message: error.message || 'Failed to save bank account',
          account_types: await this.bankAccountService.getAccountTypes(),
        },
      };
    }
  }
  async handleBack(decryptedData: DecryptedDataDto): Promise<any> {
    return {
      version: decryptedData.version,
      screen: decryptedData.screen,
      data: {},
    };
  }

  async handleUnknownAction(decryptedData: DecryptedDataDto): Promise<any> {
    this.logger.warn(`Unknown action: ${decryptedData.action}`);
    
    return {
      version: decryptedData.version,
      screen: decryptedData.screen,
      data: {
        error_message: `Unknown action: ${decryptedData.action}`,
      },
    };
  }

  async handleFlowCompletionWebhook(phoneNumber: string, responseJson: string): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { phoneNumber, isPhoneVerified: true },
        orderBy: { phoneVerifiedAt: 'desc' },
      });

      if (!user) {
        this.logger.error(`User not found: ${phoneNumber}`);
        return;
      }

      const bankAccount = await this.prisma.userBankAccount.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!bankAccount) {
        this.logger.error(`Bank account not found for user: ${user.id}`);
        return;
      }

      const aaEligibility = checkAAEligibilityByIFSC(bankAccount.ifscCode || '');

      if (aaEligibility.isEligible) {
        const consentData = await this.aaService.createConsentRequest({ userId: user.id, brandId: user.brandId });
        await this.whatsappTemplateService.sendAAConsentTemplate(phoneNumber, consentData.redirectionUrl);
      } else {
        await this.whatsappTemplateService.sendBankAccountTemplate(phoneNumber);
      }
    } catch (error) {
      this.logger.error(`Error in handleFlowCompletionWebhook: ${error.message}`);
    }
  }
}
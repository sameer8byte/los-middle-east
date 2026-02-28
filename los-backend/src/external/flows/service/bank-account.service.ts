import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BankAccountDto } from '../dto/bank-account.dto';
import { user_bank_verification_method, user_bank_verification_status } from '@prisma/client';
import { PennyDropService } from '../../../external/pennyDrop/pennyDrop.service';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pennyDropService: PennyDropService,
  ) {}

  async saveBankAccount(data: BankAccountDto, phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    verificationStatus?: string;
    accountHolderName?: string;
  }> {
    const user = await this.prisma.user.findFirst({
      where: { phoneNumber, isPhoneVerified: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!user) {
      throw new NotFoundException('Verified user not found');
    }

    const existingAccount = await this.prisma.userBankAccount.findFirst({
      where: { userId: user.id },
    });

    // Perform penny drop verification
    try {
      const pennyDropResult = await this.pennyDropService.verifyBankAccountWithFallback(
        user.brandId,
        {
          accountNumber: data.account_number,
          ifsc: data.ifsc_code.toUpperCase(),
          beneficiaryName: data.account_name,
        },
        user.id,
        existingAccount?.id || null,
      );

      const bankData = {
        accountHolderName: pennyDropResult.accountHolderName || data.account_name,
        accountNumber: data.account_number,
        ifscCode: data.ifsc_code.toUpperCase(),
        bankName: data.bank_name || '',
        accountType: data.account_type,
        isPrimary: true,
        verificationMethod: user_bank_verification_method.PENNY_DROP,
        verificationStatus: pennyDropResult.success
          ? user_bank_verification_status.VERIFIED
          : user_bank_verification_status.FAILED,
        pennyDropResponse: pennyDropResult.raw,
        verifiedAt: pennyDropResult.success ? new Date() : null,
        isVerified: pennyDropResult.success,
        pennyVerifiedName: pennyDropResult.accountHolderName || null,
      };

      if (existingAccount) {
        await this.prisma.userBankAccount.update({
          where: { id: existingAccount.id },
          data: bankData,
        });
      } else {
        await this.prisma.userBankAccount.create({
          data: {
            userId: user.id,
            ...bankData,
          },
        });
      }

      this.logger.log(`Bank account verified for user ${user.id}`);

      return {
        success: pennyDropResult.success,
        message: pennyDropResult.success
          ? `Account verified successfully. Account holder: ${pennyDropResult.accountHolderName}`
          : 'Account verification failed. Please check your account details and try again.',
        verificationStatus: bankData.verificationStatus,
        accountHolderName: pennyDropResult.accountHolderName,
      };
    } catch (error) {
      this.logger.error(`Penny drop verification failed for user ${user.id}:`, error);

      // Fallback: Save as PENDING if verification service fails
      const bankData = {
        accountHolderName: data.account_name,
        accountNumber: data.account_number,
        ifscCode: data.ifsc_code.toUpperCase(),
        bankName: data.bank_name || '',
        accountType: data.account_type,
        isPrimary: true,
        verificationMethod: user_bank_verification_method.MANUAL,
        verificationStatus: user_bank_verification_status.PENDING,
      };

      if (existingAccount) {
        await this.prisma.userBankAccount.update({
          where: { id: existingAccount.id },
          data: bankData,
        });
      } else {
        await this.prisma.userBankAccount.create({
          data: {
            userId: user.id,
            ...bankData,
          },
        });
      }

      this.logger.log(`Bank account saved as PENDING for user ${user.id}`);

      return {
        success: true,
        message: 'Account saved. Verification is pending and will be completed by our team.',
        verificationStatus: user_bank_verification_status.PENDING,
      };
    }
  }

  async getAccountTypes() {
    return [
      { id: 'SAVINGS', title: 'Savings' },
      { id: 'CURRENT', title: 'Current' },
    ];
  }
}

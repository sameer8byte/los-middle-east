import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  BankAccountStatement,
  user_bank_verification_method,
  user_bank_verification_status,
} from "@prisma/client";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { CreateBankAccountStatementDto } from "./dto/create-bank-statement";
import { PrismaService } from "src/prisma/prisma.service";
import { BsaReportService } from "src/features/bsaReport/bsaReport.service";
import { BankAccountStatementService } from "src/shared/bank-account-statement/bank-account-statement.service";
import { UpdateUserBankAccountDto } from "src/shared/user-bank-account/dto/update-user-bank-account.dto";
import { UserBankAccountService } from "src/shared/user-bank-account/user-bank-account.service";
import { PennyDropService } from "src/external/pennyDrop/pennyDrop.service";

@Injectable()
export class WebBankService {
  private readonly logger = new Logger(WebBankService.name);

  constructor(
    private readonly userBankAccountService: UserBankAccountService,
    private readonly bankAccountStatementService: BankAccountStatementService,
    private readonly awsS3Service: AwsPublicS3Service, // Replace with actual type if available,
    private readonly prisma: PrismaService, // Replace with actual type if available
    private readonly bsaReportService: BsaReportService, // Replace with actual type if available
    private readonly pennyDropService: PennyDropService,
  ) {}

  // get user bank account
  async getBankAccount(id: string) {
    const userBankAccount = await this.prisma.userBankAccount.findFirst({
      where: {
        id: id,
      },
      include: {
        BankAccountStatement: true,
      },
    });
    if (!userBankAccount) {
      throw new NotFoundException(`User Bank Account with id ${id} not found`);
    }

    return userBankAccount;
  }

  // update user bank account
  async updateBankAccount(id: string, data: UpdateUserBankAccountDto) {
    const userBankAccount = await this.userBankAccountService.findOne(id, {
      user: {
        include: {
          brand: {
            select: {
              id: true,
            },
          },
        },
      },
    });
    if (!userBankAccount) {
      throw new NotFoundException(`User Bank Account with id ${id} not found`);
    }
    const email = userBankAccount.user.email;
    if (!email) {
      throw new BadRequestException(
        `User Bank Account with id ${id} has no associated email`,
      );
    }
    if (
      userBankAccount.verificationStatus ===
      user_bank_verification_status.VERIFIED
    ) {
      throw new NotFoundException(
        `User Bank Account with id ${id} is not in PENDING status`,
      );
    }
    await this.userBankAccountService.update(id, data);

    // verify using penny drop
    await this.pennyDropService.verifyBankAccountWithFallback(
      userBankAccount.user["brand"].id,
      {
        accountNumber: data.accountNumber,
        ifsc: data.ifscCode,
        beneficiaryName: data.accountHolderName,
        // email: email,
      },
      userBankAccount.userId,
      id,
    );

    userBankAccount.verificationStatus = user_bank_verification_status.VERIFIED;
    userBankAccount.verificationMethod =
      user_bank_verification_method.PENNY_DROP;
    userBankAccount.updatedAt = new Date();
    userBankAccount.accountHolderName = data.accountHolderName;
    userBankAccount.accountNumber = data.accountNumber;
    userBankAccount.ifscCode = data.ifscCode;
    userBankAccount.bankAddress = data.bankAddress;
    userBankAccount.bankName = data.bankName;
    return userBankAccount;
  }

  // get user bank account statement
  async getBankAccountStatement(
    bankAccountId: string,
  ): Promise<BankAccountStatement[] | null> {
    return this.bankAccountStatementService.findAll({
      userBankAccountId: bankAccountId,
    });
  }

  async createBankStatement(
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
    return statement;
  }

  // delete bank statement
  async deleteBankStatement(bankAccountId: string) {
    return this.bankAccountStatementService.remove(bankAccountId);
  }
}

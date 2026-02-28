import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserBankAccountDto } from "./dto/create-user-bank-account.dto";
import { UpdateUserBankAccountDto } from "./dto/update-user-bank-account.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma, user_data_status } from "@prisma/client";

@Injectable()
export class UserBankAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateUserBankAccountDto) {
    return this.prisma.userBankAccount.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll() {
    return this.prisma.userBankAccount.findMany();
  }

  async findOne(id: string, include?: Prisma.UserBankAccountInclude) {
    const account = await this.prisma.userBankAccount.findUnique({
      where: { id },
      include,
    });
    if (!account) throw new NotFoundException("Bank account not found");
    return account;
  }

  async update(id: string, dto: UpdateUserBankAccountDto) {
    return this.prisma.userBankAccount.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.userBankAccount.delete({ where: { id } });
  }

  async findByUserId(userId: string) {
    return this.prisma.userBankAccount.findMany({ where: { userId } });
  }

  async findByUserIdAndBrandId(userId: string, brandId: string) {
    return this.prisma.userBankAccount.findMany({ where: { userId } });
  }
  // upsert
  async upsert(userId: string, brandId: string, dto: CreateUserBankAccountDto) {
    return this.prisma.userBankAccount.upsert({
      where: {
        userId_accountNumber: {
          userId,
          accountNumber: dto.accountNumber,
        },
      },
      create: {
        ...dto,
        userId,
      },
      update: dto,
    });
  }

  // create not verified user bank account
  async createNotVarifiedUserBankAccount(
    userId: string,
    brandId: string,
    data: CreateUserBankAccountDto,
  ) {
    const existingBankAccount = await this.prisma.userBankAccount.findFirst({
      where: {
        userId,
        isPrimary: true,
      },
    });

    if (!existingBankAccount) {
      return this.create(userId, {
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        bankAddress: data.bankAddress,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
        accountType: data.accountType,
      });
    }
    if (existingBankAccount.userDataStatus === user_data_status.NOT_VERIFIED) {
      return this.update(existingBankAccount.id, {
        accountHolderName:
          existingBankAccount.accountHolderName || data.accountHolderName,
        accountNumber: existingBankAccount.accountNumber || data.accountNumber,
        ifscCode: existingBankAccount.ifscCode || data.ifscCode,
        bankName: existingBankAccount.bankName || data.bankName,
        accountType: existingBankAccount.accountType || data.accountType,
        bankAddress: existingBankAccount.bankAddress || data.bankAddress,
      });
    }

    return existingBankAccount;
  }
}

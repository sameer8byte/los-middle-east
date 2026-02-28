import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class CommonAppService {
  constructor(
    private readonly awsS3Service: AwsPublicS3Service, // Replace with actual type if available,
    private readonly prisma: PrismaService, // Replace with actual type if available
  ) {}

  async awsSignedUrl(key: string): Promise<{ url: string }> {
    if (!key) {
      throw new BadRequestException('Query parameter "key" is required');
    }

    const url = await this.awsS3Service.getSignedUrl(key);
    return { url };
  }

  async resetUser(brandId: string, email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email, brandId },
      });
      if (!user) {
        throw new NotFoundException(
          "User not found for the provided email and brand ID",
        );
      }
      const userId = user.id;
      if (!userId) {
        throw new NotFoundException("User ID is missing");
      }
      await this.prisma.$transaction(async (tx) => {
        await Promise.all([
          tx.payslip.deleteMany({ where: { userId } }),
          tx.bankAccountStatement.deleteMany({ where: { userId } }),
          tx.userBankAccount.deleteMany({ where: { userId } }),
          tx.employment.deleteMany({ where: { userId } }),
          tx.userDetails.deleteMany({ where: { userId } }),
          tx.document.deleteMany({ where: { userId } }),
          tx.userGeoTag.deleteMany({ where: { userId } }),
        ]);

        // Create fresh data
        await Promise.all([
          tx.userDetails.create({
            data: {
              firstName: null,
              lastName: null,
              dateOfBirth: null,
              userId,
            },
          }),
          tx.employment.create({
            data: {
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
              userId,
            },
          }),
          tx.userBankAccount.create({
            data: {
              accountHolderName: "",
              accountNumber: "",
              ifscCode: "",
              bankAddress: "",
              bankName: "",
              accountType: "SAVINGS",
              verificationMethod: "MANUAL",
              verificationStatus: "PENDING",
              userId,
              isPrimary: true,
            },
          }),
        ]);

        // Update user core fields
        await tx.user.update({
          where: { id: userId },
          data: {
            onboardingStep: 2,
            email: null,
            isEmailVerified: false,
            isPhoneVerified: false,
            status_id: BigInt(1), // Reset to PENDING status
          },
        });
      });
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === "P2002") {
        throw new InternalServerErrorException("Unique constraint failed");
      }
      throw new InternalServerErrorException(
        "An unexpected error occurred while resetting the user",
      );
    }
  }
}

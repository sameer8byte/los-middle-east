import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  platform_type,
  PartnerUserPermission,
  PartnerPermission,
} from "@prisma/client";
import * as path from "path";
import * as ejs from "ejs";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginTokenService } from "src/shared/loginToken/login-token.service";
import { EmailService } from "src/core/communication/services/email.service";

@Injectable()
export class PartnerAuthService {
  private readonly isDev = process.env.NODE_ENV === "development";
  constructor(
    private readonly loginTokenService: LoginTokenService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService, // Assuming emailService is part of LoginTokenService
  ) {}

  // login with email and password
  async loginWithEmailAndPassword(
    email: string,
    password: string,
    deviceId: string,
  ): Promise<{
    accessToken: string;
    data: {
      id: string;
      email: string;
      name: string;
      brandId: string | null;
      role: string[];
      permissions: string[];
      reportsToId: string | null;
      userPermissions: (PartnerUserPermission & {
        partnerPermission: PartnerPermission;
      })[];
    };
  }> {
    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: {
        email: email,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        reportsToId: true,
        brandRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
            brandId: true,
          },
        },
        globalRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            partnerPermission: true,
          },
        },
      },
    });

    if (!partnerUser) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Use bcrypt to compare the password
    const isPasswordValid = await bcrypt.compare(
      password,
      partnerUser.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const { accessToken } = await this.loginTokenService.createTokens(
      null,
      partnerUser.id,
      partnerUser.email,
      deviceId,
      null,
      platform_type.PARTNER,
    );
    if (!accessToken) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      accessToken,
      data: {
        id: partnerUser.id,
        email: partnerUser.email,
        name: partnerUser.name,
        role: [
          ...partnerUser.globalRoles.map((role) => role.role.name),
          ...partnerUser.brandRoles.map((role) => role.role.name),
        ],
        permissions: partnerUser.userPermissions.map(
          (userPermission) => userPermission.partnerPermission.name,
        ),
        brandId: partnerUser.brandRoles[0]?.brandId || null,
        reportsToId: partnerUser.reportsToId || null,
        userPermissions: partnerUser.userPermissions,
      },
    };
  }

  async logout(partnerUserId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: {
        id: partnerUserId,
        isActive: true,
      },
    });
    const userRoles = await this.prisma.partnerLoginToken.findMany({
      where: {
        partnerUserId: partnerUser.id,
        isLoggedOut: false,
      },
    });
    await this.prisma.partnerLoginToken.updateMany({
      where: {
        id: {
          in: userRoles.map((role) => role.id),
        },
      },
      data: {
        isLoggedOut: true,
        isLogoutAt: new Date(),
      },
    });

    return true;
  }

  async sendResetPasswordEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!partnerUser) {
      throw new BadRequestException("User not found");
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentResetToken =
      await this.prisma.partnerUserPasswordResetToken.findFirst({
        where: {
          partnerUserId: partnerUser.id,
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { createdAt: "desc" },
      });

    if (recentResetToken) {
      throw new BadRequestException(
        "A reset token was already sent in the last 24 hours",
      );
    }
    const length = 32; // Length of the token
    const token = Array.from(
      { length },
      () => Math.random().toString(36)[2],
    ).join("");

    const resetToken = await this.prisma.partnerUserPasswordResetToken.create({
      data: {
        partnerUserId: partnerUser.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour validity
        redirectLink: `/reset-password?token=${token}`,
      },
    });

    try {
      // Send email here (pseudo)
      await this.sendRegistrationEmail(partnerUser.id, resetToken.token);
    } catch (error) {
      await this.prisma.partnerUserPasswordResetToken.delete({
        where: { id: resetToken.id },
      });
      console.error("Failed to send reset password email:", error);
      throw new BadRequestException(
        "Failed to send reset password email. Please try again later.",
      );
    }

    return resetToken;
  }

  async sendRegistrationEmail(partnerUserId: string, token: string) {
    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { id: partnerUserId },
      select: {
        email: true,
        name: true,
      },
    });
    if (!partnerUser) {
      throw new BadRequestException("Partner user not found.");
    }

    const data = {
      userName: `${partnerUser.name || ""}`.trim(),
      resetLink: `${process.env.PARTNER_URL}/reset-password?partnerUserId=${partnerUserId}&token=${token}`,
      expiryHours: 24,
      year: new Date().getFullYear(),
    };

    const templateName = "reset-password";
    const templatePath = path.join(
      process.cwd(),
      this.isDev ? "src" : "src",
      "templates",
      "partner",
      "ejs",
      `${templateName}.ejs`,
    );

    let htmlContent: string;
    try {
      htmlContent = await ejs.renderFile(templatePath, data);
    } catch (err) {
      throw new BadRequestException(`Failed to render email template: ${err}`);
    }

    const emailResult = await this.emailService.sendEmail({
      to: "",
      name: partnerUser.name || "",
      subject: `Reset Password for Your Account`,
      html: htmlContent,
    });

    if (!emailResult) {
      throw new BadRequestException("Failed to send Loan Application email.");
    }

    return emailResult;
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken =
      await this.prisma.partnerUserPasswordResetToken.findUnique({
        where: { token },
      });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Hash the new password before storing
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.partnerUser.update({
        where: { id: resetToken.partnerUserId },
        data: { password: hashedPassword },
      }),
      this.prisma.partnerUserPasswordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return true;
  }

  // Method to update password (for authenticated users)
  async updatePassword(
    partnerUserId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { id: partnerUserId, isActive: true },
      select: { id: true, password: true },
    });

    if (!partnerUser) {
      throw new BadRequestException("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      partnerUser.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update the password
    await this.prisma.partnerUser.update({
      where: { id: partnerUserId },
      data: { password: hashedNewPassword },
    });

    return { success: true };
  }
}

import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "src/core/communication/services/email.service";
import * as dayjs from "dayjs";
import * as crypto from "crypto";
import * as ejs from "ejs";
import * as path from "path";
// Access the default function from the namespace import
const _dayjs = dayjs.default;

@Injectable()
export class PartnerUserSecureCodeService {
  private readonly logger = new Logger(PartnerUserSecureCodeService.name);
  private readonly ENCRYPTION_KEY = process.env.PARTNER_CODE_ENCRYPTION_KEY || 'default-32-char-key-change-in-prod-environment!!';
  private readonly SALT_LENGTH = 32; // For additional security
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    // Warn if using default key in any environment
    if (!process.env.PARTNER_CODE_ENCRYPTION_KEY) {
      this.logger.warn(
        '⚠️ PARTNER_CODE_ENCRYPTION_KEY not set - using default development key. ' +
        'CHANGE THIS IN PRODUCTION! Set PARTNER_CODE_ENCRYPTION_KEY environment variable.'
      );
      throw new Error('PARTNER_CODE_ENCRYPTION_KEY environment variable is required for secure code operations'); 
    }
    
    // Validate key length
    if (this.ENCRYPTION_KEY.length < 32) {
      throw new Error(
        'PARTNER_CODE_ENCRYPTION_KEY must be at least 32 characters long. ' +
        'Current length: ' + this.ENCRYPTION_KEY.length
      );
    }
    
    // Log initialization
    this.logger.log('PartnerUserSecureCodeService initialized with encryption key');
  }

  /**
   * Generate a highly secure partner user code
   * Format: PU-{timestamp}-{random}-{checksum}
   */
  private generatePartnerUserCode(): string {
    const timestamp = Date.now().toString(36); // Base36 timestamp
    const randomPart = crypto.randomBytes(8).toString('hex'); // 16 char random hex
    const checksum = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 char checksum
    
    return `PU-${timestamp}-${randomPart}-${checksum}`;
  }

  /**
   * Encrypt sensitive data using AES-256-CBC
   */
  private encryptData(text: string): { encrypted: string; iv: string; salt: string } {
    try {
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const key = crypto.pbkdf2Sync(this.ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
      const iv = crypto.randomBytes(16); // AES block size
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      cipher.setAutoPadding(true);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      throw new Error(
         error.message ||
        'Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data using AES-256-CBC
   */
  private decryptData(encryptedData: { encrypted: string; iv: string; salt: string }): string {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const key = crypto.pbkdf2Sync(this.ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      decipher.setAutoPadding(true);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(error.message || 'Failed to decrypt data');
    }
  }

  /**
   * Generate and store encrypted partner user code
   */
  async generateSecurePartnerCode(
    partnerUserId: string, 
    performedByUserId?: string,
    userEmail?: string,
    userName?: string
  ): Promise<string> {
    try {
      // Generate unique code
      let partnerCode: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isUnique && attempts < maxAttempts) {
        partnerCode = this.generatePartnerUserCode();
        
        // Check if this specific code already exists
        const existingCode = await this.prisma.partner_user_codes.findFirst({
          where: { 
            encryptedCode: this.encryptData(partnerCode).encrypted
          }
        });
        
        if (!existingCode) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique partner code after multiple attempts');
      }

      // Encrypt the code
      const encryptedCodeData = this.encryptData(partnerCode!);

      // Deactivate any existing codes for this user first
      await this.prisma.partner_user_codes.updateMany({
        where: {
          partnerUserId,
          isActive: true
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedByUserId: performedByUserId
        }
      });

      // Store in database with metadata
      const codeRecord = await this.prisma.partner_user_codes.create({
        data: {
          partnerUserId,
          encryptedCode: encryptedCodeData.encrypted,
          encryptionIv: encryptedCodeData.iv,
          encryptionSalt: encryptedCodeData.salt,
          isActive: true,
          generatedByUserId: performedByUserId,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
          metadata: {
            algorithm: 'aes-256-cbc',
            generatedAt: new Date().toISOString(),
            ipAddress: 'server-generated'
          }
        }
      });

      // Send email if email address is provided
      if (userEmail) {
        await this.sendSecureCodeEmail(userEmail, userName || 'Partner User', partnerCode!);
      }

      // Create audit log
      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'GENERATE', {
        status: 'SUCCESS',
        codeId: codeRecord.id,
        emailSent: !!userEmail
      });

      this.logger.log(`Secure partner code generated for user: ${partnerUserId}${userEmail ? ` and email sent to ${userEmail}` : ''}`);
      return partnerCode!;

    } catch (error) {
      // Log failure
      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'GENERATE', {
        status: 'FAILURE',
        errorMessage: error.message
      });
      
      throw new BadRequestException(
          error.message ||
        'Failed to generate secure partner code');
    }
  }

  /**
   * Retrieve and decrypt partner user code
   */
  async getPartnerUserCode(partnerUserId: string, performedByUserId?: string): Promise<string | null> {
    try {
      const codeRecord = await this.prisma.partner_user_codes.findFirst({
        where: {
          partnerUserId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!codeRecord) {
        return null;
      }

      // Decrypt the code
      const decryptedCode = this.decryptData({
        encrypted: codeRecord.encryptedCode,
        iv: codeRecord.encryptionIv,
        salt: codeRecord.encryptionSalt
      });

      // Log access
      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'ACCESS', {
        status: 'SUCCESS',
        codeId: codeRecord.id
      });

      return decryptedCode;

    } catch (error) {
      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'ACCESS', {
        status: 'FAILURE',
        errorMessage: error.message
      });

      this.logger.error(`Failed to retrieve partner code for user ${partnerUserId}`, error);
      return null;
    }
  }

  /**
   * Regenerate partner user code (deactivates old one)
   */
  async regeneratePartnerUserCode(partnerUserId: string, performedByUserId?: string): Promise<string> {
    try {
      // Deactivate existing codes
      await this.prisma.partner_user_codes.updateMany({
        where: {
          partnerUserId,
          isActive: true
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedByUserId: performedByUserId
        }
      });

      // Generate new code
      const newCode = await this.generateSecurePartnerCode(partnerUserId, performedByUserId);

      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'REGENERATE', {
        status: 'SUCCESS'
      });

      return newCode;

    } catch (error) {
      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'REGENERATE', {
        status: 'FAILURE',
        errorMessage: error.message
      });

      throw new BadRequestException('Failed to regenerate partner code');
    }
  }

  /**
   * Validate partner user code using timing-safe comparison
   */
  async validatePartnerUserCode(partnerUserId: string, inputCode: string, performedByUserId?: string): Promise<boolean> {
    try {
      const actualCode = await this.getPartnerUserCode(partnerUserId, performedByUserId);
      
      if (!actualCode) {
        await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'VALIDATE', {
          status: 'FAILURE',
          errorMessage: 'No active code found'
        });
        return false;
      }

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(actualCode, 'utf8'),
        Buffer.from(inputCode, 'utf8')
      );

      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'VALIDATE', {
        status: isValid ? 'SUCCESS' : 'FAILURE',
        errorMessage: isValid ? null : 'Code mismatch'
      });

      return isValid;

    } catch (error) {
      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'VALIDATE', {
        status: 'FAILURE',
        errorMessage: error.message
      });

      return false;
    }
  }

  /**
   * Deactivate partner user code
   */
  async deactivatePartnerUserCode(partnerUserId: string, performedByUserId?: string): Promise<boolean> {
    try {
      const result = await this.prisma.partner_user_codes.updateMany({
        where: {
          partnerUserId,
          isActive: true
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedByUserId: performedByUserId
        }
      });

      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'DEACTIVATE', {
        status: 'SUCCESS',
        deactivatedCount: result.count
      });

      return result.count > 0;

    } catch (error) {
      await this.createPartnerCodeAuditLog(partnerUserId, performedByUserId, 'DEACTIVATE', {
        status: 'FAILURE',
        errorMessage: error.message
      });

      return false;
    }
  }

  /**
   * Create audit log for partner code operations
   */
  private async createPartnerCodeAuditLog(
    partnerUserId: string,
    performedByUserId: string | undefined,
    action: string,
    auditData: any
  ): Promise<void> {
    try {
      await this.prisma.partner_user_code_audit_logs.create({
        data: {
          partnerUserId,
          performedByUserId,
          action,
          status: auditData.status,
          errorMessage: auditData.errorMessage,
          metadata: {
            ...auditData,
            timestamp: new Date().toISOString(),
            userAgent: 'server'
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to create partner code audit log', error);
    }
  }

  /**
   * Get partner code audit logs with pagination
   */
  async getPartnerCodeAuditLogs(
    partnerUserId: string,
    paginationDto: PaginationDto
  ): Promise<any> {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.partner_user_code_audit_logs.findMany({
        where: { partnerUserId },
        include: {
          partnerUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          performedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.partner_user_code_audit_logs.count({
        where: { partnerUserId }
      })
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get active partner codes summary
   */
  async getPartnerCodesStatus(partnerUserId: string): Promise<any> {
    const activeCodes = await this.prisma.partner_user_codes.findMany({
      where: {
        partnerUserId,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        generatedByUserId: true,
        metadata: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalGenerated = await this.prisma.partner_user_codes.count({
      where: { partnerUserId }
    });

    const recentActivity = await this.prisma.partner_user_code_audit_logs.findMany({
      where: { partnerUserId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        action: true,
        status: true,
        createdAt: true,
        performedByUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return {
      activeCodes: activeCodes.length,
      totalGenerated,
      latestCode: activeCodes[0] || null,
      recentActivity
    };
  }

  /**
   * Send secure code via email
   */
  private async sendSecureCodeEmail(
    email: string,
    userName: string,
    secureCode: string
  ): Promise<void> {
    try {
      // Path to the EJS template
      const templatePath = path.join(
        process.cwd(),
        'src',
        'templates',
        'partner',
        'secure-code-email.ejs'
      );

      // Render the template
      const htmlContent = await ejs.renderFile(templatePath, {
        userName,
        secureCode,
        generatedAt: new Date().toLocaleString()
      });

      const success = await this.emailService.sendEmail({
        to: email,
        subject: 'Your Secure Partner Code ',
        html: htmlContent,
        name: userName,
      });

      if (success) {
        this.logger.log(`Secure code email sent successfully to ${email}`);
      } else {
        this.logger.warn(`Failed to send secure code email to ${email}`);
      }
    } catch (error) {
      this.logger.error(`Error sending secure code email to ${email}:`, error instanceof Error ? error.message : String(error));
      // Don't throw error here - email failure shouldn't block code generation
    }
  }
}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly prisma: PrismaService) {}

  private formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async getLeadDataFromPancard(pancard: string) {
    try {
      if (!pancard || pancard.trim() === '') {
        throw new BadRequestException('PAN card is required');
      }

      const panNumber = pancard.trim().toUpperCase();

      // Step 1: First check if central dedup is enabled in any brand config
      const brandConfigs = await this.prisma.brandConfig.findMany({
        where: {
          enable_central_dedup: true,
        },
        select: {
          brandId: true,
          enable_central_dedup: true,
        },
      });

      // If no brand has central dedup enabled, return early
      if (brandConfigs.length === 0) {
        return {
          Status: 0,
          Message: 'Central deduplication is not enabled for any brand',
          lead_data: [],
        };
      }

      const documents = await this.prisma.document.findMany({
        where: {
          documentNumber: panNumber,
          type: 'PAN',
        },
        select: {
          userId: true,
        },
      });

      if (documents.length === 0) {
        return {
          Status: 0,
          Message: 'No document found for this PAN card',
          lead_data: [],
        };
      }

      const userIds = documents.map((doc) => doc.userId);
      const uniqueUserIds = [...new Set(userIds)];

      const usersWithLoans = await this.prisma.user.findMany({
        where: {
          id: { in: uniqueUserIds },
        },
        include: {
          userDetails: true,
          loans: {
            where: {
              isActive: true,
            },
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
              loanDetails: true,
            },
            orderBy: {
              applicationDate: 'desc',
            },
          },
        },
      });

      const leadData = [];

      const statusMapping: Record<string, string> = {
        DISBURSED: 'DISBURSED',
        COMPLETED: 'CLOSED',
        ACTIVE: 'ACTIVE',
        APPROVED: 'APPROVED',
        PENDING: 'PENDING',
        REJECTED: 'REJECTED',
        OVERDUE: 'OVERDUE',
      };

      // Get all brand IDs that have central dedup enabled
      const dedupEnabledBrandIds = brandConfigs.map(config => config.brandId);
      
      for (const user of usersWithLoans) {
        const firstName = user.userDetails?.firstName || '';
        const mobile = user.phoneNumber || '';

        for (const loan of user.loans) {
          // Step 2: Check if this loan's brand has central dedup enabled
          if (!dedupEnabledBrandIds.includes(loan.brand.id)) {
            // Skip loans from brands that don't have central dedup enabled
            continue;
          }

          const status = statusMapping[loan.status] || loan.status;

          // Only include disbursal_date, repayment_date, lead_final_disbursed_date, and dpd
          // for specific statuses
          const includeDatesAndDpd = [
            'DISBURSED',
            'ACTIVE',
            'PARTIALLY_PAID',
            'PAID',
            'COMPLETED',
            'POST_ACTIVE',
            'WRITE_OFF',
            'SETTLED',
            'DEFAULTED',
            'OVERDUE'
          ].includes(status);

          let dpd: number | null = null;
          if (includeDatesAndDpd && loan.loanDetails?.dueDate) {
            const dueDate = new Date(loan.loanDetails.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Only calculate DPD if due date is in the past
            if (dueDate < today) {
              const timeDiff = today.getTime() - dueDate.getTime();
              dpd = Math.floor(timeDiff / (1000 * 3600 * 24));
            }
          }

          
          const lead = {
            lead_id: loan.formattedLoanId || loan.id,
            first_name: firstName,
            mobile: mobile,
            pancard: panNumber,
            status: status,
            source: loan.brand?.name || 'Unknown',
            reason: loan.purpose || '',
            loan_recommended: loan.amount || 0,
            created_on: this.formatDateTime(loan.applicationDate),
            disbursal_date: includeDatesAndDpd ? this.formatDate(loan.disbursementDate) : null,
            repayment_date: includeDatesAndDpd ? this.formatDate(loan.loanDetails.dueDate) : null, 
            lead_final_disbursed_date: includeDatesAndDpd ? this.formatDate(loan.disbursementDate) : null,
            dpd: includeDatesAndDpd ? dpd : null,
          };

          leadData.push(lead);
        }
      }

      if (leadData.length === 0) {
        return {
          Status: 0,
          Message: usersWithLoans.length > 0 
            ? 'Found user but no active loan data from brands with central dedup enabled for this PAN card' 
            : 'Found user but no active loan data found for this PAN card',
          lead_data: [],
        };
      }

      return {
        Status: 1,
        Message: 'Success',
        lead_data: leadData,
      };
    } catch (error) {
      this.logger.error(`Error fetching lead data for PAN: ${pancard}`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to fetch lead data. Please try again later.'
      );
    }
  }
}
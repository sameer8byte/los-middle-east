import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GlobalSearchDto } from "./dto/global-search.dto";

@Injectable()
export class PartnerGlobalSearchService {
  private readonly logger = new Logger(PartnerGlobalSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(brandId: string, dto: GlobalSearchDto) {
    const { search } = dto;
    const searchTerm = search.trim();
    const limit = 50;

    if (searchTerm.length < 3) {
      return {
        users: { data: [], total: 0 },
        loans: { data: [], total: 0 },
        documents: { data: [], total: 0 },
        totalResults: 0,
      };
    }

    const [usersResult, loansResult, documentsResult] = await Promise.all([
      this.searchUsers(brandId, searchTerm, limit),
      this.searchLoans(brandId, searchTerm, limit),
      this.searchDocuments(brandId, searchTerm, limit),
    ]);

    const [users, usersCount] = usersResult;
    const [loans, loansCount] = loansResult;
    const [documents, documentsCount] = documentsResult;

    const totalUsers = typeof usersCount === "number" ? usersCount : 0;
    const totalLoans = typeof loansCount === "number" ? loansCount : 0;
    const totalDocuments =
      typeof documentsCount === "number" ? documentsCount : 0;

    return {
      users: { data: users, total: totalUsers },
      loans: { data: loans, total: totalLoans },
      documents: { data: documents, total: totalDocuments },
      totalResults: totalUsers + totalLoans + totalDocuments,
    };
  }

  private async searchUsers(
    brandId: string,
    searchTerm: string,
    limit: number,
  ) {
    const words = searchTerm.split(/\s+/);
    let nameConditions: any[] = [];

    if (words.length === 1) {
      const word = words[0];
      nameConditions = [
        { firstName: { contains: word, mode: "insensitive" as const } },
        { middleName: { contains: word, mode: "insensitive" as const } },
        { lastName: { contains: word, mode: "insensitive" as const } },
      ];
    } else if (words.length >= 2) {
      nameConditions = [
        {
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            { lastName: { contains: words[1], mode: "insensitive" as const } },
          ],
        },
        {
          AND: [
            { firstName: { contains: words[1], mode: "insensitive" as const } },
            { lastName: { contains: words[0], mode: "insensitive" as const } },
          ],
        },
      ];

      if (words.length >= 3) {
        nameConditions.push({
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            {
              middleName: { contains: words[1], mode: "insensitive" as const },
            },
            { lastName: { contains: words[2], mode: "insensitive" as const } },
          ],
        });
      }
    }

    const searchConditions = {
      brandId,
      isActive: true,
      OR: [
        { id: { contains: searchTerm, mode: "insensitive" as const } },
        { email: { contains: searchTerm, mode: "insensitive" as const } },
        {
          formattedUserId: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
        { phoneNumber: { contains: searchTerm, mode: "insensitive" as const } },
        nameConditions.length > 0
          ? { userDetails: { OR: nameConditions } }
          : null,
        {
          documents: {
            some: {
              documentNumber: {
                contains: searchTerm,
                mode: "insensitive" as const,
              },
            },
          },
        },
      ].filter(Boolean),
    };

    const [users, total, partnerUsers] = await Promise.all([
      this.prisma.user.findMany({
        where: searchConditions,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          formattedUserId: true,
          createdAt: true,
          allocated_partner_user_id: true,
          occupation_type_id: true,
          is_terms_accepted: true,
          status_id: true,
          userDetails: {
            select: {
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: searchConditions }),
      this.prisma.partnerUser.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    ]);

    // Map partner users for efficient lookup
    const partnerUsersMap = new Map(partnerUsers.map((pu) => [pu.id, pu]));

    // Enhance users with allocated partner details
    const enrichedUsers = users.map((user) => ({
      ...user,
      allocatedPartner: user.allocated_partner_user_id
        ? partnerUsersMap.get(user.allocated_partner_user_id) || null
        : null,
    }));

    return [enrichedUsers, total];
  }

  private async searchLoans(
    brandId: string,
    searchTerm: string,
    limit: number,
  ) {
    const words = searchTerm.split(/\s+/);
    let nameConditions: any[] = [];

    if (words.length === 1) {
      const word = words[0];
      nameConditions = [
        { firstName: { contains: word, mode: "insensitive" as const } },
        { middleName: { contains: word, mode: "insensitive" as const } },
        { lastName: { contains: word, mode: "insensitive" as const } },
      ];
    } else if (words.length >= 2) {
      nameConditions = [
        {
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            { lastName: { contains: words[1], mode: "insensitive" as const } },
          ],
        },
        {
          AND: [
            { firstName: { contains: words[1], mode: "insensitive" as const } },
            { lastName: { contains: words[0], mode: "insensitive" as const } },
          ],
        },
      ];

      if (words.length >= 3) {
        nameConditions.push({
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            {
              middleName: { contains: words[1], mode: "insensitive" as const },
            },
            { lastName: { contains: words[2], mode: "insensitive" as const } },
          ],
        });
      }
    }

    const searchConditions = {
      brandId,
      isActive: true,
      OR: [
        { id: { contains: searchTerm, mode: "insensitive" as const } },
        {
          formattedLoanId: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
        { oldLoanId: { contains: searchTerm, mode: "insensitive" as const } },

        {
          user: {
            OR: [
              { email: { contains: searchTerm, mode: "insensitive" as const } },
              {
                phoneNumber: {
                  contains: searchTerm,
                  mode: "insensitive" as const,
                },
              },
              {
                formattedUserId: {
                  contains: searchTerm,
                  mode: "insensitive" as const,
                },
              },
              nameConditions.length > 0
                ? { userDetails: { OR: nameConditions } }
                : null,
            ].filter(Boolean),
          },
        },
      ],
    };

    const [loans, total] = await Promise.all([
      this.prisma.loan.findMany({
        where: searchConditions,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          formattedLoanId: true,
          amount: true,
          status: true,
          createdAt: true,
          repayment: {
            select: {
              totalObligation: true,
              totalFees: true,
            },
          },
          applicationDate: true,
          approvalDate: true,
          disbursementDate: true,
          closureDate: true,
          is_repeat_loan: true,
          oldLoanId: true,
          loanType: true,
          loanStatusHistory: {
            select: {
              status: true,
              createdAt: true,
              message: true,
              partnerUser: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          purpose: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              formattedUserId: true,
              occupation_type_id: true,
              is_terms_accepted: true,
              status_id: true,
              userDetails: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
            },
          },
          allottedPartners: {
            select: {
              partnerUser: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            take: 2,
          },
          loanDetails: {
            select: {
              dueDate: true,
              durationDays: true,
            },
          },
          paymentRequests: {
            select: {
              id: true,
              type: true,
              currency: true,
              status: true,
              createdAt: true,
              collectionTransactions: {
                where: {
                  status: "SUCCESS",
                  opsApprovalStatus: "APPROVED",
                },
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  method: true,
                  completedAt: true,
                  createdAt: true,
                  opsApprovalStatus: true,
                  externalRef: true,
                  paymentLink: true,
                  note: true,
                  currency: true,
                  totalFees: true,
                  totalTaxes: true,
                  totalPenalties: true,
                },
              },
              disbursalTransactions: {
                where: {
                  status: "SUCCESS",
                },
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  method: true,
                  completedAt: true,
                  createdAt: true,
                  currency: true,
                },
              },
              partialCollectionTransactions: {
                where: {
                  status: "SUCCESS",
                  opsApprovalStatus: "APPROVED",
                },
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  opsApprovalStatus: true,
                  externalRef: true,
                  paymentLink: true,
                  note: true,
                  method: true,
                  completedAt: true,
                  createdAt: true,
                  currency: true,
                  totalFees: true,
                  totalTaxes: true,
                  totalPenalties: true,
                  principalAmount: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.loan.count({ where: searchConditions }),
    ]);

    return [loans, total];
  }

  private async searchDocuments(
    brandId: string,
    searchTerm: string,
    limit: number,
  ) {
    const words = searchTerm.split(/\s+/);
    let nameConditions: any[] = [];

    if (words.length === 1) {
      const word = words[0];
      nameConditions = [
        { firstName: { contains: word, mode: "insensitive" as const } },
        { middleName: { contains: word, mode: "insensitive" as const } },
        { lastName: { contains: word, mode: "insensitive" as const } },
      ];
    } else if (words.length >= 2) {
      nameConditions = [
        {
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            { lastName: { contains: words[1], mode: "insensitive" as const } },
          ],
        },
        {
          AND: [
            { firstName: { contains: words[1], mode: "insensitive" as const } },
            { lastName: { contains: words[0], mode: "insensitive" as const } },
          ],
        },
      ];

      if (words.length >= 3) {
        nameConditions.push({
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            {
              middleName: { contains: words[1], mode: "insensitive" as const },
            },
            { lastName: { contains: words[2], mode: "insensitive" as const } },
          ],
        });
      }
    }

    const searchConditions = {
      user: {
        brandId,
        isActive: true,
      },
      OR: [
        { id: { contains: searchTerm, mode: "insensitive" as const } },
        {
          documentNumber: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
        {
          user: {
            OR: [
              { email: { contains: searchTerm, mode: "insensitive" as const } },
              {
                phoneNumber: {
                  contains: searchTerm,
                  mode: "insensitive" as const,
                },
              },
              {
                formattedUserId: {
                  contains: searchTerm,
                  mode: "insensitive" as const,
                },
              },
              nameConditions.length > 0
                ? { userDetails: { OR: nameConditions } }
                : null,
            ].filter(Boolean),
          },
        },
      ],
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: searchConditions,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          documentNumber: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              formattedUserId: true,
              userDetails: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.document.count({ where: searchConditions }),
    ]);

    return [documents, total];
  }

  async getUserById(brandId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        brandId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        occupation_type_id: true,
        is_terms_accepted: true,
        status_id: true,
        phoneNumber: true,
        formattedUserId: true,
        createdAt: true,
        userDetails: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            dateOfBirth: true,
            profilePicUrl: true,
            profileVideoUrl: true,
          },
        },
        loans: {
          select: {
            id: true,
            formattedLoanId: true,
            amount: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            allottedPartners: {
              select: {
                id: true,
                partnerUserId: true,
                allottedAt: true,
                amount: true,
                partnerUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            loan_collection_allocated_partner: {
              select: {
                id: true,
                partnerUserId: true,
                allocatedAt: true,
                isActive: true,
                amount: true,
                remarks: true,
                partnerUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              where: {
                isActive: true,
                isDeallocated: false,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
            documentNumber: true,
            createdAt: true,
          },
        },
        allocated_partner_user_id: true,
        onboardingJourneys: {
          select: {
            stepNumber: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            brandId: true,
            reason: true,
            partnerUserId: true,
          },
          orderBy: {
            stepNumber: "desc",
          },
        },
      },
    });
  }
}

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { getDateFilter } from "src/utils";
import { PrismaService } from "src/prisma/prisma.service";
import { loan_status_enum } from "@prisma/client";

@Injectable()
export class PartnerCollectionService {
  private readonly logger = new Logger(PartnerCollectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsPublicS3Service // Replace with actual type if available
  ) {}

  async getCollections(
    brandId: string,
    paginationDto: PaginationDto,
    filter?: Record<string, string>
  ) {
    const search = filter?.search?.trim() || "";
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;
    const pDateFilter = JSON.parse(paginationDto?.dateFilter || "[]");
    const dateFilter = getDateFilter(pDateFilter);
    
    // Parse collection executive and supervisor filters
    let collectionExecutiveIds: string[] = [];
    let collectionSupervisorIds: string[] = [];
    
    try {
      if (filter?.assignedCollectionExecutive) {
        collectionExecutiveIds = JSON.parse(filter.assignedCollectionExecutive);
      }
      if (filter?.assignedCollectionSupervisor) {
        collectionSupervisorIds = JSON.parse(filter.assignedCollectionSupervisor);
      }
    } catch (error) {
      this.logger.error("Error parsing collection filters:", error);
    }

    const where: any = {
      brandId: brandId,
      status: {
        in: [
          loan_status_enum.ACTIVE,
          loan_status_enum.PARTIALLY_PAID,
          loan_status_enum.POST_ACTIVE,
        ],
      },
      AND: [
        Object.keys(dateFilter).length > 0 ? { loanDetails: { dueDate: dateFilter } } : null,
        search
          ? {
              OR: [
                {
                  user: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  user: {
                    phoneNumber: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  user: {
                    formattedUserId: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                { id: { contains: search, mode: "insensitive" as const } },
                { userId: { contains: search, mode: "insensitive" as const } },
                {
                  formattedLoanId: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : null,
      ].filter(Boolean), // remove null entries to avoid Prisma errors
    };

    // Add collection executive filter if specified
    if (collectionExecutiveIds.length > 0) {
      where.AND.push({
        loan_collection_allocated_partner: {
          some: {
            partnerUserId: {
              in: collectionExecutiveIds,
            },
            isActive: true,
          },
        },
      });
    }

    // Add collection supervisor filter if specified
    if (collectionSupervisorIds.length > 0) {
      where.AND.push({
        loan_collection_allocated_partner: {
          some: {
            partnerUserId: {
              in: collectionSupervisorIds,
            },
            isActive: true,
          },
        },
      });
    }

    const [data, total] = await Promise.all([
      this.prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          loanDetails: {
            dueDate: "desc",
          },
        },
        select: {
          id: true,
          userId: true,
          brandId: true,
          status: true,
          formattedLoanId: true,
          amount: true,
          applicationDate: true,
          approvalDate: true,
          disbursementDate: true,
          createdAt: true,
          user: {
            select: {
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
          loanDetails: {
            select: {
              durationDays: true,
              dueDate: true,
            },
          },
          loan_collection_allocated_partner: {
            select: {
              id: true,
              partnerUserId: true,
              allocatedAt: true,
              isActive: true,
              isDeallocated: true,
              remarks: true,
              amount: true,
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
      }),
      this.prisma.loan.count({ where }),
    ]);

    const formattedLoans = data.map((loan) => {
      const firstName = loan.user.userDetails?.firstName || "";
      const middleName = loan.user.userDetails?.middleName || "";
      const lastName = loan.user.userDetails?.lastName || "";
      const fullName = `${firstName} ${middleName} ${lastName}`.trim();

      return {
        id: loan.id,
        userId: loan.userId,
        brandId: loan.brandId,
        status: loan.status,
        name: fullName,
        email: loan.user.email,
        phoneNumber: loan.user.phoneNumber,
        formattedLoanId: loan.formattedLoanId,
        amount: loan.amount,
        applicationDate: loan.applicationDate,
        approvalDate: loan.approvalDate,
        disbursementDate: loan.disbursementDate,
        createdAt: loan.createdAt,
        durationDays: loan.loanDetails?.durationDays || null,
        dueDate: loan.loanDetails?.dueDate || null,
        allocatedPartners: (loan.loan_collection_allocated_partner || []).map((ap) => ({
          id: ap.id,
          partnerUserId: ap.partnerUserId,
          partnerName: ap.partnerUser?.name || "N/A",
          partnerEmail: ap.partnerUser?.email || "N/A",
          allocatedAt: ap.allocatedAt,
          remarks: ap.remarks,
          amount: ap.amount,
        })),
      };
    });

    return {
      loans: formattedLoans,
      meta: {
        total: total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPreCollections(
    brandId: string,
    paginationDto: PaginationDto,
    filter?: Record<string, string>
  ) {
    const search = filter?.search?.trim() || "";
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;
    const pDateFilter = JSON.parse(paginationDto?.dateFilter || "[]");
    const dateFilter = getDateFilter(pDateFilter);

    // Parse collection executive and supervisor filters
    let collectionExecutiveIds: string[] = [];
    let collectionSupervisorIds: string[] = [];
    
    try {
      if (filter?.assignedCollectionExecutive) {
        collectionExecutiveIds = JSON.parse(filter.assignedCollectionExecutive);
      }
      if (filter?.assignedCollectionSupervisor) {
        collectionSupervisorIds = JSON.parse(filter.assignedCollectionSupervisor);
      }
    } catch (error) {
      this.logger.error("Error parsing collection filters:", error);
    }

    const where: any = {
      brandId: brandId,
      status: {
        in: [
          loan_status_enum.ACTIVE,
          loan_status_enum.PARTIALLY_PAID,
          loan_status_enum.POST_ACTIVE,
        ],
      },
      AND: [
        Object.keys(dateFilter).length > 0 ? { loanDetails: { dueDate: dateFilter } } : null,
        {
          loanDetails: {
            postActiveDate: {
              gte: new Date(),
            },
          },
        },
        search
          ? {
              OR: [
                {
                  user: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  user: {
                    phoneNumber: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  user: {
                    formattedUserId: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                { id: { contains: search, mode: "insensitive" as const } },
                { userId: { contains: search, mode: "insensitive" as const } },
                {
                  formattedLoanId: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : null,
      ].filter(Boolean),
    };

    // Add collection executive filter if specified
    if (collectionExecutiveIds.length > 0) {
      where.AND.push({
        loan_collection_allocated_partner: {
          some: {
            partnerUserId: {
              in: collectionExecutiveIds,
            },
            isActive: true,
          },
        },
      });
    }

    // Add collection supervisor filter if specified
    if (collectionSupervisorIds.length > 0) {
      where.AND.push({
        loan_collection_allocated_partner: {
          some: {
            partnerUserId: {
              in: collectionSupervisorIds,
            },
            isActive: true,
          },
        },
      });
    }

    const [data, total] = await Promise.all([
      this.prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          loanDetails: {
            dueDate: "desc",
          },
        },
        select: {
          id: true,
          userId: true,
          brandId: true,
          status: true,
          formattedLoanId: true,
          amount: true,
          applicationDate: true,
          approvalDate: true,
          disbursementDate: true,
          createdAt: true,
          user: {
            select: {
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
          loanDetails: {
            select: {
              durationDays: true,
              dueDate: true,
            },
          },
          loan_collection_allocated_partner: {
            select: {
              id: true,
              partnerUserId: true,
              allocatedAt: true,
              isActive: true,
              isDeallocated: true,
              remarks: true,
              amount: true,
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
      }),
      this.prisma.loan.count({ where }),
    ]);

    const formattedLoans = data.map((loan) => {
      const firstName = loan.user.userDetails?.firstName || "";
      const middleName = loan.user.userDetails?.middleName || "";
      const lastName = loan.user.userDetails?.lastName || "";
      const fullName = `${firstName} ${middleName} ${lastName}`.trim();

      return {
        id: loan.id,
        userId: loan.userId,
        brandId: loan.brandId,
        status: loan.status,
        name: fullName,
        email: loan.user.email,
        phoneNumber: loan.user.phoneNumber,
        formattedLoanId: loan.formattedLoanId,
        amount: loan.amount,
        applicationDate: loan.applicationDate,
        approvalDate: loan.approvalDate,
        disbursementDate: loan.disbursementDate,
        createdAt: loan.createdAt,
        durationDays: loan.loanDetails?.durationDays || null,
        dueDate: loan.loanDetails?.dueDate || null,
        allocatedPartners: (loan.loan_collection_allocated_partner || []).map((ap) => ({
          id: ap.id,
          partnerUserId: ap.partnerUserId,
          partnerName: ap.partnerUser?.name || "N/A",
          partnerEmail: ap.partnerUser?.email || "N/A",
          allocatedAt: ap.allocatedAt,
          remarks: ap.remarks,
          amount: ap.amount,
        })),
      };
    });

    return {
      loans: formattedLoans,
      meta: {
        total: total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostCollections(
    brandId: string,
    paginationDto: PaginationDto,
    filter?: Record<string, string>
  ) {
    const search = filter?.search?.trim() || "";
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;
    const pDateFilter = JSON.parse(paginationDto?.dateFilter || "[]");
    const dateFilter = getDateFilter(pDateFilter);

    // Parse collection executive and supervisor filters
    let collectionExecutiveIds: string[] = [];
    let collectionSupervisorIds: string[] = [];
    
    try {
      if (filter?.assignedCollectionExecutive) {
        collectionExecutiveIds = JSON.parse(filter.assignedCollectionExecutive);
      }
      if (filter?.assignedCollectionSupervisor) {
        collectionSupervisorIds = JSON.parse(filter.assignedCollectionSupervisor);
      }
    } catch (error) {
      this.logger.error("Error parsing collection filters:", error);
    }

    const where: any = {
      brandId: brandId,
      status: {
        in: [
          loan_status_enum.ACTIVE,
          loan_status_enum.PARTIALLY_PAID,
          loan_status_enum.POST_ACTIVE,
        ],
      },
      AND: [
        Object.keys(dateFilter).length > 0 ? { loanDetails: { dueDate: dateFilter } } : null,
        {
          loanDetails: {
            postActiveDate: {
              lt: new Date(),
            },
          },
        },
        search
          ? {
              OR: [
                {
                  user: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  user: {
                    phoneNumber: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  user: {
                    formattedUserId: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                { id: { contains: search, mode: "insensitive" as const } },
                { userId: { contains: search, mode: "insensitive" as const } },
                {
                  formattedLoanId: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : null,
      ].filter(Boolean),
    };

    // Add collection executive filter if specified
    if (collectionExecutiveIds.length > 0) {
      where.AND.push({
        loan_collection_allocated_partner: {
          some: {
            partnerUserId: {
              in: collectionExecutiveIds,
            },
            isActive: true,
          },
        },
      });
    }

    // Add collection supervisor filter if specified
    if (collectionSupervisorIds.length > 0) {
      where.AND.push({
        loan_collection_allocated_partner: {
          some: {
            partnerUserId: {
              in: collectionSupervisorIds,
            },
            isActive: true,
          },
        },
      });
    }

    const [data, total] = await Promise.all([
      this.prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          loanDetails: {
            dueDate: "desc",
          },
        },
        select: {
          id: true,
          userId: true,
          brandId: true,
          status: true,
          formattedLoanId: true,
          amount: true,
          applicationDate: true,
          approvalDate: true,
          disbursementDate: true,
          createdAt: true,
          user: {
            select: {
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
          loanDetails: {
            select: {
              durationDays: true,
              dueDate: true,
            },
          },
          loan_collection_allocated_partner: {
            select: {
              id: true,
              partnerUserId: true,
              allocatedAt: true,
              isActive: true,
              isDeallocated: true,
              remarks: true,
              amount: true,
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
      }),
      this.prisma.loan.count({ where }),
    ]);

    const formattedLoans = data.map((loan) => {
      const firstName = loan.user.userDetails?.firstName || "";
      const middleName = loan.user.userDetails?.middleName || "";
      const lastName = loan.user.userDetails?.lastName || "";
      const fullName = `${firstName} ${middleName} ${lastName}`.trim();

      return {
        id: loan.id,
        userId: loan.userId,
        brandId: loan.brandId,
        status: loan.status,
        name: fullName,
        email: loan.user.email,
        phoneNumber: loan.user.phoneNumber,
        formattedLoanId: loan.formattedLoanId,
        amount: loan.amount,
        applicationDate: loan.applicationDate,
        approvalDate: loan.approvalDate,
        disbursementDate: loan.disbursementDate,
        createdAt: loan.createdAt,
        durationDays: loan.loanDetails?.durationDays || null,
        dueDate: loan.loanDetails?.dueDate || null,
        allocatedPartners: (loan.loan_collection_allocated_partner || []).map((ap) => ({
          id: ap.id,
          partnerUserId: ap.partnerUserId,
          partnerName: ap.partnerUser?.name || "N/A",
          partnerEmail: ap.partnerUser?.email || "N/A",
          allocatedAt: ap.allocatedAt,
          remarks: ap.remarks,
          amount: ap.amount,
        })),
      };
    });

    return {
      loans: formattedLoans,
      meta: {
        total: total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createRepaymentTimeline(
    data: {
      loanId: string;
      partnerUserId: string;
      message?: string;
      callId?: string; // Optional, if you want to link a call
    },
    file?: Express.Multer.File
  ) {
    const { loanId, partnerUserId, message } = data;

    if (!loanId || !partnerUserId) {
      throw new BadRequestException(
        "loanId, userId, partnerUserId, and brandId are required"
      );
    }

    this.logger.log(
      `Creating repayment timeline for loanId: ${loanId}, partnerUserId: ${partnerUserId}`
    );

    let fileUrl: string | null = null;
    // Verify loan exists
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: true,
        agreement: true,
      },
    });
    if (file) {
      try {
        fileUrl = await this.awsS3Service.uploadPublicFile(
          file,
          loan.brandId,
          loan.user.id,
          "documents"
        );
        this.logger.log(`File uploaded to S3: ${fileUrl}`);
      } catch (error) {
        throw new InternalServerErrorException(
          error?.message || "File upload failed"
        );
      }
    }

    if (!loan) {
      throw new NotFoundException(`Loan with ID ${loanId} not found`);
    }

    try {
      const repaymentTimeline = await this.prisma.repaymentTimeline.create({
        data: {
          loanId: loan.id,
          userId: loan.userId,
          userCallId: data.callId || null, // Optional, if you want to link a call
          brandId: loan.brandId,
          partnerUserId,
          fileUrl,
          message: message ?? null,
        },
      });
      return repaymentTimeline;
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || "Failed to create repayment timeline"
      );
    }
  }

  async getRepaymentTimeline(brandId: string, loanId: string) {
    if (!loanId) {
      throw new BadRequestException("loanId is required");
    }

    if (!brandId) {
      throw new BadRequestException("brandId is required");
    }

    const repaymentTimeline = await this.prisma.repaymentTimeline.findMany({
      where: {
        loanId,
        brandId, // ✅ Ensures the brand owns the data
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        userCall: {
          include: {
            recordings: true,
            events: true,
          },
        },

        partnerUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    const formattedTimeline = repaymentTimeline.map((timeline) => ({
      id: timeline.id,
      loanId: timeline.loanId,
      userId: timeline.userId,
      partnerUserId: timeline.partnerUserId,
      fileUrl: timeline.fileUrl,
      message: timeline.message,
      createdAt: timeline.createdAt,
      updatedAt: timeline.updatedAt,
      user: {
        id: timeline.user.id,
        email: timeline.user.email,
        phoneNumber: timeline.user.phoneNumber,
      },
      partnerUser: {
        id: timeline.partnerUser?.id,
        email: timeline.partnerUser?.email,
      },
      userCall: timeline.userCall
        ? {
            id: timeline.userCall.id,
            recordings: timeline.userCall.recordings.map((recording) => ({
              id: recording.id,
              filePrivateUrl: recording.filePrivateUrl,
            })),
            events: timeline.userCall.events.map((event) => ({
              id: event.id,
              type: event.type,
              callCreatedReason: event.callCreatedReason,
              duration: event.duration,
              callStatus: event.callStatus,
              createdAt: event.createdAt,
              updatedAt: event.updatedAt,
            })),
          }
        : null,
    }));
    return formattedTimeline;
  }
}

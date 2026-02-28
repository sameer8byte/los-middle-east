import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-update-partner.dto";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import * as bcrypt from "bcrypt";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { RoleEnum } from "src/constant/roles";

@Injectable()
export class ParterUserService {
  private readonly logger = new Logger(ParterUserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUsers(
    brandId: string,
    paginationDto: PaginationDto,
    filter?: Record<string, string>
  ) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const search = filter?.search?.trim() || "";
    const roleId = filter?.roleId ? Number.parseInt(filter.roleId, 10) : null;
    const permissionId = filter?.permissionId ? Number.parseInt(filter.permissionId, 10) : null;

    const skip = (page - 1) * limit;
    const where = {
      AND: [
        search
          ? {
              OR: [
                {
                  name: { contains: search, mode: "insensitive" as const },
                },
                {
                  email: { contains: search, mode: "insensitive" as const },
                },
                { id: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : null,
      ].filter(Boolean), // Remove any null values from the array
    };

    const brandRolesFilter: any = {
      brandId: brandId,
    };

    // Add role filter if roleId is provided
    if (roleId) {
      brandRolesFilter.roleId = roleId;
    }

    // Add additional filters for permission if provided
    const additionalFilters: any[] = [];
    if (permissionId) {
      additionalFilters.push({
        userPermissions: {
          some: {
            partnerPermissionId: permissionId,
          },
        },
      });
    }

    const [data, total] = await Promise.all([
      this.prisma.partnerUser.findMany({
        where: {
          ...where,
          isActive: true,
          brandRoles: {
            some: brandRolesFilter,
          },
          // Add permission filter if specified
          ...(additionalFilters.length > 0 && { AND: additionalFilters }),
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          brandRoles: {
            where: {
              brandId: brandId,
            },
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
          reportsTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },

        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.partnerUser.count({
        where: {
          ...where,
          isActive: true,
          brandRoles: {
            some: brandRolesFilter,
          },
          // Add permission filter if specified
          ...(additionalFilters.length > 0 && { AND: additionalFilters }),
        },
      }),
    ]);
    
    // format the data
    const formattedData = data.map((user) => {
      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        name: user.name,
        brandRoles: user.brandRoles || "N/A",
        reportsTo: user.reportsTo || null,
      };
    });

    return {
      users: formattedData,
      meta: {
        total: total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    return this.prisma.partnerUser.findUnique({
      where: {
        id: userId,
        isActive: true,
      },
      include: {
        brandRoles: {
          include: {
            role: true,
          },
        },
        userPermissions: {
          include: {
            partnerPermission: true,
          },
        },
        reportsTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getRoles() {
    return this.prisma.partnerRole.findMany();
  }

  async getPermissions() {
    return this.prisma.partnerPermission.findMany();
  }

  async getRolesAndPermissions() {
    const roles = await this.getRoles();
    const permissions = await this.getPermissions();

    return {
      roles,
      permissions,
    };
  }

  async upsertPartnerUser(
    brandId: string,
    partnerUserId: string,
    data: CreateUserDto,
    partnerUser?: AuthenticatedPartnerUser
  ) {
    const { email, password, name, phone_number, roleId, permissions, reportsToId, isReloanSupport, is_fresh_loan_support } = data;
    const action = partnerUserId ? "UPDATE" : "CREATE";
    const performedByUserId = partnerUser?.id || null; // ID of the user performing the action

    try {
      // Get the role to check if it's CREDIT_EXECUTIVE
      const role = await this.prisma.partnerRole.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        // Log failure
        await this.createAuditLog(brandId, null, performedByUserId, action, {
          status: "FAILURE",
          errorMessage: "Invalid role provided",
        });
        throw new BadRequestException("Invalid role");
      }

      // Validate reportsToId for CREDIT_EXECUTIVE role
      if (role.name === "CREDIT_EXECUTIVE") {
        if (!reportsToId) {
          await this.createAuditLog(brandId, null, performedByUserId, action, {
            status: "FAILURE",
            errorMessage: "reportsToId is mandatory for CREDIT_EXECUTIVE role",
          });
          throw new BadRequestException(
            "Report To field is mandatory for CREDIT_EXECUTIVE role"
          );
        }

        // Validate that the reportsTo user has SANCTION_MANAGER or SANCTION_HEAD role
        const supervisor = await this.prisma.partnerUser.findUnique({
          where: { id: reportsToId, isActive: true },
          include: {
            brandRoles: {
              where: { brandId },
              include: { role: true },
            },
            globalRoles: {
              include: { role: true },
            },
          },
        });

        if (!supervisor) {
          await this.createAuditLog(brandId, null, performedByUserId, action, {
            status: "FAILURE",
            errorMessage: `Supervisor not found - ReportsToId: ${reportsToId}`,
          });
          throw new BadRequestException("Selected supervisor not found");
        }

        const supervisorRoles = [
          ...supervisor.brandRoles.map((br) => br.role.name),
          ...supervisor.globalRoles.map((gr) => gr.role.name),
        ];

        const allowedSupervisorRoles = ["SANCTION_MANAGER", "SANCTION_HEAD"];
        const hasValidRole = supervisorRoles.some((r) =>
          allowedSupervisorRoles.includes(r)
        );

        if (!hasValidRole) {
          await this.createAuditLog(brandId, null, performedByUserId, action, {
            status: "FAILURE",
            errorMessage: `Supervisor has invalid roles - SupervisorId: ${reportsToId}, Roles: ${supervisorRoles.join(", ")}`,
          });
          throw new BadRequestException(
            "Report To must be a user with SANCTION_MANAGER or SANCTION_HEAD role"
          );
        }
      }

      const userExists = await this.prisma.partnerUser.findUnique({
        where: { email, isActive: true },
      });

      if (userExists && !partnerUserId) {
        await this.createAuditLog(brandId, null, performedByUserId, action, {
          status: "FAILURE",
          errorMessage: "User already exists with this email",
        });
        throw new BadRequestException("User already exists with this email");
      }

      const permissionData = permissions.map((permission) => ({
        partnerPermissionId: permission.permissionId,
        partnerPermissionType: permission.permissionType,
      }));

      if (!userExists) {
        // For new users, password is required
        if (!password) {
          await this.createAuditLog(brandId, null, performedByUserId, action, {
            status: "FAILURE",
            errorMessage: "Password is required for new users",
          });
          throw new BadRequestException("Password is required for new users");
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await this.prisma.partnerUser.create({
          data: {
            email,
            password: hashedPassword,
            name,
            // ...existing data ...,
            reportsToId: reportsToId || null,
            isReloanSupport: role.name === "CREDIT_EXECUTIVE" ? (isReloanSupport ?? false) : false,
            is_fresh_loan_support: role.name === "CREDIT_EXECUTIVE" ? (is_fresh_loan_support ?? true) : true,
            brandRoles: {
              create: {
                brandId,
                roleId,
              },
            },
            userPermissions: {
              createMany: {
                data: permissionData,
              },
            },
            updatedAt: new Date(),
          },
        });

        // Update phone_number after user creation
        if (phone_number !== undefined) {
          await this.prisma.$executeRawUnsafe(
            'UPDATE partner_users SET phone_number = $1 WHERE id = $2',
            phone_number || null,
            newUser.id
          );
        }

        // Log successful creation
        await this.createAuditLog(brandId, newUser.id, performedByUserId, action, {
          status: "SUCCESS",
        });

        return newUser;
      }

      // If user exists (edit mode), update user data
      const updateData: any = {
        name,
        // phone_number will be updated via raw query if needed
        isActive: true,
        deletedAt: null,
        reportsToId: reportsToId || null,
        isReloanSupport: role.name === "CREDIT_EXECUTIVE" ? (isReloanSupport ?? false) : false,
        is_fresh_loan_support: role.name === "CREDIT_EXECUTIVE" ? (is_fresh_loan_support ?? true) : true,
        updatedAt: new Date(),
      };

      // Only update password if it's provided (for password changes in edit mode)
      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      const result = await this.prisma
        .$transaction([
          // Delete existing permissions
          this.prisma.partnerUserPermission.deleteMany({
            where: {
              partnerUserId: userExists.id,
            },
          }),
          // Delete existing brand roles for the current brand
         userExists.id && this.prisma.partnerUserBrandRole.deleteMany({
            where: {
              partnerUserId: userExists.id,
              brandId: brandId,
            },
          }),
          // Update user and create new permissions and roles
          this.prisma.partnerUser.update({
            where: { id: userExists.id },
            data: {
              ...updateData,
              brandRoles: {
                create: {
                  brandId,
                  roleId,
                },
              },
              userPermissions: {
                createMany: {
                  data: permissionData,
                },
              },
            },
          }),
        ])
        .then((result) => result[2]);

      // Update phone_number separately using raw SQL
      if (phone_number !== undefined) {
        await this.prisma.$executeRawUnsafe(
          'UPDATE partner_users SET phone_number = $1 WHERE id = $2',
          phone_number || null,
          userExists.id
        );
      }
      await this.createAuditLog(brandId, userExists.id, performedByUserId, action, {
        status: "SUCCESS",
        changes: {
          passwordUpdated: !!password,
          permissionsUpdated: permissions.length > 0,
        },
      });

      return result;
    } catch (error) {
      // If error wasn't already logged, log it here
      if (!(error instanceof BadRequestException)) {
        await this.createAuditLog(
          brandId,
          partnerUserId || null,
          performedByUserId,
          action,
          {
            status: "FAILURE",
            errorMessage: error.message,
          }
        ).catch(() => {
          // Silently fail if audit log creation fails
        });
      }
      throw error;
    }
  }

  async deletePartnerUser(
    userId: string,
    partnerUser?: AuthenticatedPartnerUser
  ) {
    const performedByUserId = partnerUser?.id || null; // ID of the user performing the delete action

    try {
      const user = await this.prisma.partnerUser.findUnique({
        where: { id: userId, isActive: true },
        include: {
          brandRoles: {
            select: {
              brandId: true,
            },
          },
        },
      });
      if (!user) {
        throw new BadRequestException("User not found or already deleted");
      }
      const brandId = user.brandRoles[0]?.brandId;
      const result = await this.prisma.partnerUser.update({
        where: {
          id: userId,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      // Log successful deletion
      if (brandId) {
        await this.createAuditLog(brandId, userId, performedByUserId, "DELETE", {
          status: "SUCCESS",
        });
      }

      return result;
    } catch (error) {
      // Log failure if we have the user info
      const user = await this.prisma.partnerUser
        .findUnique({
          where: { id: userId },
          include: {
            brandRoles: {
              select: {
                brandId: true,
              },
            },
          },
        })
        .catch(() => null);

      if (user?.brandRoles[0]?.brandId) {
        await this.createAuditLog(
          user.brandRoles[0].brandId,
          userId,
          performedByUserId,
          "DELETE",
          {
            status: "FAILURE",
            errorMessage: error.message,
          }
        ).catch(() => {
          // Silently fail if audit log creation fails
        });
      }

      throw error;
    }
  }

  private async createAuditLog(
    brandId: string,
    partnerUserId: string | null,
    performedByUserId: string | null,
    action: string,
    auditData: {
      status?: string;
      errorMessage?: string | null;
      changes?: any;
    } = {}
  ) {
    try {
      await this.prisma.partner_user_audit_logs.create({
        data: {
          partner_user_id: partnerUserId,
          brand_id: brandId,
          action,
          status: auditData.status || "SUCCESS",
          error_message: auditData.errorMessage,
          changes: auditData.changes,
          metadata: {
            timestamp: new Date().toISOString(),
          },
          performed_by_partner_user_id: performedByUserId,
        },
      });
    } catch (error) {
      // Log audit creation failure to console but don't throw to avoid disrupting main flow
      console.error("Failed to create audit log:", error);
    }
  }

  async partnerUserLogin(partnerUserId: string) {
    const todayDate = _dayjs().startOf("day").toDate();
    return await this.prisma.partnerUserLoginLog.upsert({
      where: {
        partnerUserId_date: {
          partnerUserId,
          date: todayDate,
        },
      },
      create: {
        partnerUserId,
        date: todayDate,
        firstLogin: new Date(),
      },
      update: {
        lastLogout: new Date(),
      },
    });
  }

  // today login logs
  async getPartnerUserLoginLogs(partnerUserId: string) {
    const logs = await this.prisma.partnerUserLoginLog.findUnique({
      where: {
        partnerUserId_date: {
          partnerUserId,
          date: new Date(),
        },
      },
    });
    return logs;
  }

  // ger Credit Executive users
  async getCreditExecutiveUsers(brandId: string) {
    return this.prisma.partnerUser.findMany({
      where: {
        isActive: true,
        brandRoles: {
          some: {
            brandId,
            role: {
              name: "CREDIT_EXECUTIVE",
            },
          },
        },
        reportsToId: {
          not: null, // Ensuring that the user has a supervisor
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // Get supervisor users (SANCTION_MANAGER and SANCTION_HEAD)
  async getSupervisorUsers(brandId: string) {
    return this.prisma.partnerUser.findMany({
      where: {
        isActive: true,
        brandRoles: {
          some: {
            brandId,
            role: {
              name: {
                in: ["SANCTION_MANAGER", "SANCTION_HEAD"],
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        brandRoles: {
          where: {
            brandId,
          },
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // Get collection executive users (users who handle collection tasks)
  async getCollectionExecutiveUsers(brandId: string) {
    return this.prisma.partnerUser.findMany({
      where: {
        isActive: true,
        brandRoles: {
          some: {
            brandId,
            role: {
              name: {
                in: [
                  

                  RoleEnum.COLLECTION_EXECUTIVE,
                ],
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        reportsToId: true,
        brandRoles: {
          where: {
            brandId,
          },
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        reportsTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // Get collection supervisor users (users who supervise collection tasks)
  async getCollectionSupervisorUsers(brandId: string) {
    return this.prisma.partnerUser.findMany({
      where: {
        isActive: true,
        brandRoles: {
          some: {
            brandId,
            role: {
              name: {
                in: [
                  
                  RoleEnum.COLLECTION_MANAGER,
                  RoleEnum.COLLECTION_HEAD,
                ],
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        reportsToId: true,
        brandRoles: {
          where: {
            brandId,
          },
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        reportsTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // Get partner user audit logs
  async getPartnerUserAuditLogs(
    brandId: string,
    paginationDto: PaginationDto,
    filter?: Record<string, any>
  ) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 20;
    const skip = (page - 1) * limit;
    const action = filter?.action;

    const where: any = {
      brandId,
    };

    if (action && action !== "all") {
      where.action = action;
    }

    const [data, total] = await Promise.all([
      this.prisma.partner_user_audit_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prisma.partner_user_audit_logs.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        partnerUserId: log.partner_user_id,
        performedByUserId: log.performed_by_partner_user_id,
        action: log.action,
        status: log.status,
        details: log.action,
        changes: log.changes,
        errorMessage: log.error_message,
        metadata: log.metadata,
        createdAt: log.created_at,
        success: log.status === "SUCCESS",
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updatePermission(
    permissionId: number,
    data: { description?: string; permission_group_id?: string },
    partnerUser?: AuthenticatedPartnerUser
  ) {
    try {
      // Build update data only with provided fields
      const updateData: any = {};

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.permission_group_id !== undefined) {
        updateData.permission_group_id = data.permission_group_id;
      }

      const updatedPermission = await this.prisma.partnerPermission.update({
        where: { id: permissionId },
        data: updateData,
      });

      return updatedPermission;
    } catch (error) {
      throw new BadRequestException(
        `Failed to update permission: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async deletePermission(
    permissionId: number,
    partnerUser?: AuthenticatedPartnerUser
  ) {
    try {
      // First check if this permission is being used
      const userPermissions = await this.prisma.partnerUserPermission.findMany({
        where: { partnerPermissionId: permissionId },
      });

      if (userPermissions.length > 0) {
        throw new BadRequestException(
          `Cannot delete permission: it is assigned to ${userPermissions.length} user(s)`
        );
      }

      const deletedPermission = await this.prisma.partnerPermission.delete({
        where: { id: permissionId },
      });

      return {
        success: true,
        message: "Permission deleted successfully",
        deletedPermission,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete permission: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async getUserAuditLogs(
    userId: string,
    paginationDto: PaginationDto & { startDate?: string; endDate?: string }
  ) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    const where:{
      partner_user_id: string;
      created_at?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      partner_user_id: userId,
    };

    // Add date range filter if provided
    if (paginationDto.startDate || paginationDto.endDate) {
      where.created_at = {};
      if (paginationDto.startDate) {
        where.created_at.gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        // End of the day for endDate
        const end = new Date(paginationDto.endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    // First, get the user to fetch performed by user details if needed
    const [data, total] = await Promise.all([
      this.prisma.partner_user_audit_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prisma.partner_user_audit_logs.count({
        where,
      }),
    ]);

    // Fetch performed by user details separately
    const auditLogsWithUsers = await Promise.all(
      data.map(async (log) => {
        let performedByUser = null;
        if (log.performed_by_partner_user_id) {
          const user = await this.prisma.partnerUser.findUnique({
            where: { id: log.performed_by_partner_user_id },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });
          performedByUser = user;
        }

        return {
          id: log.id,
          action: log.action,
          details: log.error_message,
          changes: log.changes,
          status: log.status,
          createdAt: log.created_at,
          createdBy: performedByUser,
        };
      })
    );

    return {
      data: auditLogsWithUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserCodeAuditLogs(
    userId: string,
    paginationDto: PaginationDto & { startDate?: string; endDate?: string }
  ) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      partnerUserId: userId,
    };

    // Add date range filter if provided
    if (paginationDto.startDate || paginationDto.endDate) {
      where.createdAt = {};
      if (paginationDto.startDate) {
        where.createdAt.gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        // End of the day for endDate
        const end = new Date(paginationDto.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.partner_user_code_audit_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.partner_user_code_audit_logs.count({
        where,
      }),
    ]);

    // Fetch performed by user details separately
    const codeAuditLogsWithUsers = await Promise.all(
      data.map(async (log) => {
        let performedByUser = null;
        if (log.performedByUserId) {
          const user = await this.prisma.partnerUser.findUnique({
            where: { id: log.performedByUserId },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });
          performedByUser = user;
        }

        return {
          id: log.id,
          action: log.action,
          codeStatus: log.status,
          details: log.errorMessage,
          createdAt: log.createdAt,
          createdBy: performedByUser,
        };
      })
    );

    return {
      data: codeAuditLogsWithUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserLoginLogs(
    userId: string,
    paginationDto: PaginationDto & { startDate?: string; endDate?: string }
  ) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      partnerUserId: userId,
    };

    // Add date range filter if provided
    if (paginationDto.startDate || paginationDto.endDate) {
      where.createdAt = {};
      if (paginationDto.startDate) {
        where.createdAt.gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        // End of the day for endDate
        const end = new Date(paginationDto.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Fetch all login logs without pagination first to group them
    const allLogs = await this.prisma.partnerLoginToken.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get total count before pagination
    const total = allLogs.length;

    // Group logs by date and calculate summaries
    const logsByDate = new Map<string, any[]>();

    allLogs.forEach((log) => {
      const dateKey = new Date(log.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!logsByDate.has(dateKey)) {
        logsByDate.set(dateKey, []);
      }
      const logsForDate = logsByDate.get(dateKey);
      if (logsForDate) {
        logsForDate.push(log);
      }
    });

    // Transform grouped data into summary entries
    const groupedLogs: any[] = [];
    logsByDate.forEach((logsForDate, dateKey) => {
      const sortedLogs = [...logsForDate].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const totalSessions = logsForDate.length;
      const firstLogin = sortedLogs[0]?.createdAt;
      const lastLogin = sortedLogs.at(-1)?.createdAt;

      // Build session details with better formatting
      const sessionDetailsArray = sortedLogs.map((log, idx) => {
        const loginTime = new Date(log.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        const logoutTime = log.isLoggedOut && log.isLogoutAt
          ? new Date(log.isLogoutAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          : 'N/A';

        const duration = log.isLoggedOut && log.isLogoutAt
          ? this.calculateDuration(log.createdAt, log.isLogoutAt)
          : 'Ongoing';

        return {
          sessionNumber: idx + 1,
          loginTime,
          logoutTime,
          duration,
          device: log.deviceId || 'Unknown',
          status: log.isLoggedOut ? 'Logged Out' : 'Active',
        };
      });

      const sessionDetails = sessionDetailsArray;

      groupedLogs.push({
        id: `${dateKey}_summary`,
        action: `${totalSessions} Session${totalSessions > 1 ? 's' : ''}`,
        status: "Summary",
        details: `First Login: ${firstLogin?.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })} | Last Login: ${lastLogin?.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })}`,
        changes: {
          date: dateKey,
          totalSessions,
          sessionDetails,
        },
        createdAt: firstLogin || new Date(),
        createdBy: null,
      });

      // Add individual session logs
      sortedLogs.forEach((log, index) => {
        const loginTime = new Date(log.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        const logoutTime = log.isLoggedOut && log.isLogoutAt
          ? new Date(log.isLogoutAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          : 'Active Session';

        groupedLogs.push({
          id: log.id,
          action: `Session ${index + 1}`,
          status: log.isLoggedOut ? "Logged Out" : "Active",
          details: `Login: ${loginTime} | Logout: ${logoutTime} | Device: ${log.deviceId || 'Unknown'}`,
          changes: {
            loginTime,
            logoutTime,
            deviceId: log.deviceId,
            loginDuration: log.isLoggedOut && log.isLogoutAt
              ? this.calculateDuration(log.createdAt, log.isLogoutAt)
              : 'Ongoing',
          },
          createdAt: log.createdAt,
          createdBy: null,
        });
      });
    });

    // Apply pagination on grouped results
    const paginatedLogs = groupedLogs.slice(skip, skip + limit);

    return {
      data: paginatedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private calculateDuration(startTime: Date, endTime: Date): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}

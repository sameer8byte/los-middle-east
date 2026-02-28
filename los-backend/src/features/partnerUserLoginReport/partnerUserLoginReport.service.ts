import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

export interface PartnerUserLoginReportData {
  userEmail: string;
  loginDate: string;
  totalSessions: number;
  firstLoginIST: string;
  lastLoginIST: string;
  sessions: string;
}

export interface PartnerUserLoginReportQuery {
  startDate?: string;
  endDate?: string;
  userEmail?: string;
}

@Injectable()
export class PartnerUserLoginReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getPartnerUserLoginReport(
    query: PartnerUserLoginReportQuery = {},
  ): Promise<PartnerUserLoginReportData[]> {
    const { startDate, endDate, userEmail } = query;

    // Build the WHERE clause conditions
    const whereConditions: string[] = [
      `pu.email NOT IN ('super@8byte.ai', 'ab@8byte.ai')`,
    ];

    if (userEmail) {
      whereConditions.push(`pu.email = '${userEmail}'`);
    }

    if (startDate && endDate) {
      whereConditions.push(
        `DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN '${startDate}' AND '${endDate}'`,
      );
    } else if (startDate) {
      whereConditions.push(
        `DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= '${startDate}'`,
      );
    } else if (endDate) {
      whereConditions.push(
        `DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') <= '${endDate}'`,
      );
    }

    // Uncomment this line to filter for today's logins only
    // whereConditions.push(`DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`);

    const whereClause = whereConditions.join(" AND ");

    const sqlQuery = `
      SELECT 
        pu.email AS "userEmail",
        TO_CHAR((plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "loginDate",
        COUNT(*) AS "totalSessions",

        TO_CHAR(MIN(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'HH12:MI:SS AM') AS "firstLoginIST",
        TO_CHAR(MAX(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'HH12:MI:SS AM') AS "lastLoginIST",

        STRING_AGG(
          FORMAT(
            'Login: %s | Logout: %s | Device: %s (%s) | App: %s | IP: %s',
            TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM'),
            TO_CHAR(plt."isLogoutAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM'),
            d."deviceType",
            d."os",
            d."appVersion",
            d."ipAddress"
          ),
          E'\\n'
          ORDER BY plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'
        ) AS "sessions"

      FROM 
        partner_login_tokens plt
      JOIN 
        partner_users pu ON pu.id = plt."partnerUserId"
      LEFT JOIN 
        devices d ON d.id = plt."deviceId"

      WHERE 
        ${whereClause}

      GROUP BY 
        pu.email,
        TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')

      ORDER BY 
        pu.email,
        "loginDate" DESC
    `;

    try {
      const result =
        await this.prisma.$queryRawUnsafe<PartnerUserLoginReportData[]>(
          sqlQuery,
        );

      // Convert totalSessions from BigInt to number for JSON serialization
      return result.map((row) => ({
        ...row,
        totalSessions: Number(row.totalSessions),
      }));
    } catch (error) {
      console.error("Error executing partner user login report query:", error);
      throw new Error("Failed to generate partner user login report");
    }
  }

  async getTodayLoginReport(): Promise<PartnerUserLoginReportData[]> {
    const todayCondition = `DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`;

    const sqlQuery = `
      SELECT 
        pu.email AS "userEmail",
        TO_CHAR((plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "loginDate",
        COUNT(*) AS "totalSessions",

        TO_CHAR(MIN(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'HH12:MI:SS AM') AS "firstLoginIST",
        TO_CHAR(MAX(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'HH12:MI:SS AM') AS "lastLoginIST",

        STRING_AGG(
          FORMAT(
            'Login: %s | Logout: %s | Device: %s (%s) | App: %s | IP: %s',
            TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM'),
            TO_CHAR(plt."isLogoutAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM'),
            d."deviceType",
            d."os",
            d."appVersion",
            d."ipAddress"
          ),
          E'\\n'
          ORDER BY plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'
        ) AS "sessions"

      FROM 
        partner_login_tokens plt
      JOIN 
        partner_users pu ON pu.id = plt."partnerUserId"
      LEFT JOIN 
        devices d ON d.id = plt."deviceId"

      WHERE 
        pu.email NOT IN ('super@8byte.ai', 'ab@8byte.ai')
        AND ${todayCondition}

      GROUP BY 
        pu.email,
        TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')

      ORDER BY 
        pu.email,
        "loginDate" DESC
    `;

    try {
      const result =
        await this.prisma.$queryRawUnsafe<PartnerUserLoginReportData[]>(
          sqlQuery,
        );

      return result.map((row) => ({
        ...row,
        totalSessions: Number(row.totalSessions),
      }));
    } catch (error) {
      console.error("Error executing today login report query:", error);
      throw new Error("Failed to generate today's login report");
    }
  }

  async getLoginSummaryStats(query: PartnerUserLoginReportQuery = {}): Promise<{
    totalUsers: number;
    totalSessions: number;
    uniqueLoginDates: number;
    dateRange: { start: string; end: string } | null;
  }> {
    const { startDate, endDate, userEmail } = query;

    const whereConditions: string[] = [
      `pu.email NOT IN ('super@8byte.ai', 'ab@8byte.ai')`,
    ];

    if (userEmail) {
      whereConditions.push(`pu.email = '${userEmail}'`);
    }

    if (startDate && endDate) {
      whereConditions.push(
        `DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN '${startDate}' AND '${endDate}'`,
      );
    } else if (startDate) {
      whereConditions.push(
        `DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= '${startDate}'`,
      );
    } else if (endDate) {
      whereConditions.push(
        `DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') <= '${endDate}'`,
      );
    }

    const whereClause = whereConditions.join(" AND ");

    const sqlQuery = `
      SELECT 
        COUNT(DISTINCT pu.email) as "totalUsers",
        COUNT(*) as "totalSessions",
        COUNT(DISTINCT TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')) as "uniqueLoginDates",
        MIN(TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')) as "startDate",
        MAX(TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')) as "endDate"
      FROM 
        partner_login_tokens plt
      JOIN 
        partner_users pu ON pu.id = plt."partnerUserId"
      LEFT JOIN 
        devices d ON d.id = plt."deviceId"
      WHERE 
        ${whereClause}
    `;

    try {
      const result = await this.prisma.$queryRawUnsafe<
        Array<{
          totalUsers: bigint;
          totalSessions: bigint;
          uniqueLoginDates: bigint;
          startDate: string;
          endDate: string;
        }>
      >(sqlQuery);

      const stats = result[0];

      return {
        totalUsers: Number(stats.totalUsers),
        totalSessions: Number(stats.totalSessions),
        uniqueLoginDates: Number(stats.uniqueLoginDates),
        dateRange:
          stats.startDate && stats.endDate
            ? {
                start: stats.startDate,
                end: stats.endDate,
              }
            : null,
      };
    } catch (error) {
      console.error("Error executing login summary stats query:", error);
      throw new Error("Failed to generate login summary statistics");
    }
  }
}

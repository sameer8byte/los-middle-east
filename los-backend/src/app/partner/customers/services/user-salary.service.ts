import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserSalaryDto, UpdateUserSalaryDto } from '../dto/user-salary.dto';
import { user_salaries } from '@prisma/client';

@Injectable()
export class UserSalaryService {
  private readonly logger = new Logger(UserSalaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all salary records for a user
   */
  async getUserSalaries(userId: string): Promise<user_salaries[]> {
    try {
      const salaries = await this.prisma.user_salaries.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          salary_date: 'desc',
        },
      });

      return salaries;
    } catch (error) {
      throw new BadRequestException(
        error.message ||
        'Failed to fetch salary records');
    }
  }

  /**
   * Create a new salary record
   */
  async createUserSalary(
    userId: string,
    partnerUserId: string,
    data: CreateUserSalaryDto,
  ): Promise<user_salaries> {
    try {
      // Validate that salary date is not in the future
      const salaryDate = new Date(data.salary_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (salaryDate > today) {
        throw new BadRequestException('Salary date cannot be in the future');
      }

      // Check for duplicate salary in the same month/year
      const month = salaryDate.getMonth() + 1;
      const year = salaryDate.getFullYear();

      const existingRecord = await this.prisma.user_salaries.findFirst({
        where: {
          user_id: userId,
          partner_user_id: partnerUserId,
          salary_year: year,
          salary_month: month,
        },
      });

      if (existingRecord) {
        throw new BadRequestException(
          `Salary record already exists for ${month}/${year}`,
        );
      }

      // Create the salary record (convert date string to Date object for @db.Date field)
      // Note: salary_month and salary_year are auto-generated columns, do not set them
      const salary = await this.prisma.user_salaries.create({
        data: {
          user_id: userId,
          partner_user_id: partnerUserId,
          salary_amount: data.salary_amount,
          salary_date: salaryDate,
          notes: data.notes || null,
        },
      });

      // this.logger.log(
      //   `Created salary record for user ${userId}: ${salary.id}`,
      // );

      return salary;
    } catch (error) {
      this.logger.error(
        `Error creating salary record for user ${userId}:`,
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create salary record');
    }
  }

  /**
   * Update an existing salary record
   */
  async updateUserSalary(
    userId: string,
    salaryId: string,
    data: UpdateUserSalaryDto,
  ): Promise<user_salaries> {
    try {
      // Verify the salary record belongs to the user
      const existingSalary = await this.prisma.user_salaries.findUnique({
        where: {
          id: salaryId,
        },
      });

      if (!existingSalary) {
        throw new NotFoundException('Salary record not found');
      }

      if (existingSalary.user_id !== userId) {
        throw new BadRequestException(
          'Salary record does not belong to this user',
        );
      }

      // Validate that salary date is not in the future
      const salaryDate = new Date(data.salary_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (salaryDate > today) {
        throw new BadRequestException('Salary date cannot be in the future');
      }

      const month = salaryDate.getMonth() + 1;
      const year = salaryDate.getFullYear();

      // Check for duplicate if month/year changed
      if (
        month !== existingSalary.salary_month ||
        year !== existingSalary.salary_year
      ) {
        const duplicateRecord = await this.prisma.user_salaries.findFirst({
          where: {
            id: {
              not: salaryId,
            },
            user_id: userId,
            partner_user_id: existingSalary.partner_user_id,
            salary_year: year,
            salary_month: month,
          },
        });

        if (duplicateRecord) {
          throw new BadRequestException(
            `Salary record already exists for ${month}/${year}`,
          );
        }
      }

      // Update the salary record (convert date string to Date object for @db.Date field)
      // Note: salary_month and salary_year are auto-generated columns, do not set them
      const updatedSalary = await this.prisma.user_salaries.update({
        where: {
          id: salaryId,
        },
        data: {
          salary_amount: data.salary_amount,
          salary_date: salaryDate,
          notes: data.notes || null,
        },
      });

      // this.logger.log(`Updated salary record: ${salaryId}`);

      return updatedSalary;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(
        error.message ||
        'Failed to update salary record');
    }
  }

  /**
   * Delete a salary record
   */
  async deleteUserSalary(
    userId: string,
    salaryId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the salary record belongs to the user
      const existingSalary = await this.prisma.user_salaries.findUnique({
        where: {
          id: salaryId,
        },
      });

      if (!existingSalary) {
        throw new NotFoundException('Salary record not found');
      }

      if (existingSalary.user_id !== userId) {
        throw new BadRequestException(
          'Salary record does not belong to this user',
        );
      }

      // Delete the salary record
      await this.prisma.user_salaries.delete({
        where: {
          id: salaryId,
        },
      });

      // this.logger.log(`Deleted salary record: ${salaryId}`);

      return {
        success: true,
        message: 'Salary record deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(
        error.message ||
        'Failed to delete salary record');
    }
  }
}

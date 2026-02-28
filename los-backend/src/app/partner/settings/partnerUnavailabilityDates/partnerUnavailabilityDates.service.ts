import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreatePartnerUnavailabilityDateDto } from "./dto/create-partner-unavailability-date.dto";
import { UpdatePartnerUnavailabilityDateDto } from "./dto/update-partner-unavailability-date.dto";
import { GetPartnerUnavailabilityDatesQueryDto } from "./dto/get-partner-unavailability-dates-query.dto";

@Injectable()
export class PartnerUnavailabilityDatesService {
  constructor(private readonly prisma: PrismaService) {}

  async createUnavailabilityDate(
    partnerUserId: string,
    createDto: CreatePartnerUnavailabilityDateDto,
  ) {
    try {
      // Check if partner user exists
      const partnerUser = await this.prisma.partnerUser.findUnique({
        where: { id: partnerUserId },
      });

      if (!partnerUser) {
        throw new NotFoundException("Partner user not found");
      }

      // Check if date already exists for this partner user
      const existingDate = await this.prisma.partnerUnavailabilityDate.findUnique({
        where: {
          partnerUserId_date: {
            partnerUserId,
            date: new Date(createDto.date),
          },
        },
      });

      if (existingDate) {
        throw new BadRequestException(
          "Unavailability date already exists for this date",
        );
      }

      const unavailabilityDate = await this.prisma.partnerUnavailabilityDate.create({
        data: {
          partnerUserId,
          date: new Date(createDto.date),
          reason: createDto.reason,
        },
      });

      return unavailabilityDate;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException("Failed to create unavailability date");
    }
  }

  async getUnavailabilityDates(
    partnerUserId: string,
    query: GetPartnerUnavailabilityDatesQueryDto,
  ) {
    try {
      const { year, active } = query;

      // Build where clause
      const whereClause: any = {
        partnerUserId,
      };

      if (year) {
        whereClause.date = {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        };
      }

      if (active !== undefined) {
        whereClause.isActive = active;
      }

      const unavailabilityDates =
        await this.prisma.partnerUnavailabilityDate.findMany({
          where: whereClause,
          orderBy: {
            date: "asc",
          },
        });

      return unavailabilityDates;
    } catch (error) {
      throw new BadRequestException("Failed to fetch unavailability dates");
    }
  }

  async getUnavailabilityDateById(partnerUserId: string, id: string) {
    try {
      const unavailabilityDate =
        await this.prisma.partnerUnavailabilityDate.findFirst({
          where: {
            id,
            partnerUserId,
          },
        });

      if (!unavailabilityDate) {
        throw new NotFoundException("Unavailability date not found");
      }

      return unavailabilityDate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to fetch unavailability date");
    }
  }

  async updateUnavailabilityDate(
    partnerUserId: string,
    id: string,
    updateDto: UpdatePartnerUnavailabilityDateDto,
  ) {
    try {
      // Check if the record exists
      const existingDate = await this.prisma.partnerUnavailabilityDate.findFirst({
        where: {
          id,
          partnerUserId,
        },
      });

      if (!existingDate) {
        throw new NotFoundException("Unavailability date not found");
      }

      // If updating date, check for conflicts
      if (
        updateDto.date &&
        updateDto.date !== existingDate.date.toISOString().split("T")[0]
      ) {
        const conflictingDate =
          await this.prisma.partnerUnavailabilityDate.findUnique({
            where: {
              partnerUserId_date: {
                partnerUserId,
                date: new Date(updateDto.date),
              },
            },
          });

        if (conflictingDate && conflictingDate.id !== id) {
          throw new BadRequestException(
            "Another unavailability date already exists for this date",
          );
        }
      }

      const updateData: any = {};

      if (updateDto.date) {
        updateData.date = new Date(updateDto.date);
      }
      if (updateDto.reason !== undefined) {
        updateData.reason = updateDto.reason;
      }
      if (updateDto.isActive !== undefined) {
        updateData.isActive = updateDto.isActive;
      }

      const updatedDate = await this.prisma.partnerUnavailabilityDate.update({
        where: { id },
        data: updateData,
      });

      return updatedDate;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException("Failed to update unavailability date");
    }
  }

  async deleteUnavailabilityDate(partnerUserId: string, id: string) {
    try {
      // Check if the record exists
      const existingDate = await this.prisma.partnerUnavailabilityDate.findFirst({
        where: {
          id,
          partnerUserId,
        },
      });

      if (!existingDate) {
        throw new NotFoundException("Unavailability date not found");
      }

      await this.prisma.partnerUnavailabilityDate.delete({
        where: { id },
      });

      return { message: "Unavailability date deleted successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to delete unavailability date");
    }
  }

  async checkIsPartnerAvailable(partnerUserId: string, date: Date) {
    try {
      const dateOnly = new Date(date.toISOString().split("T")[0]);

      const unavailabilityDate =
        await this.prisma.partnerUnavailabilityDate.findFirst({
          where: {
            partnerUserId,
            date: dateOnly,
            isActive: true,
          },
        });

      return {
        isAvailable: !unavailabilityDate,
        reason: unavailabilityDate?.reason || null,
      };
    } catch (error) {
      throw new BadRequestException("Failed to check partner availability");
    }
  }
}

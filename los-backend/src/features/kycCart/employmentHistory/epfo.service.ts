// src/epfo/epfo.service.ts
import { PhoneToUanService } from "../../../external/phoneToUan/phoneToUan.service";
import { UanToEmploymentService } from "../../../external/uanToEmployment/uanToEmployment.service";
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  HttpException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { v4 as uuidv4 } from "uuid";
import {
  BrandProviderType,
  BrandProviderName,
  UanToEmploymentStatus,
} from "@prisma/client";

export interface GetUanAndHistoryOptions {
  cacheOnly?: boolean;
}

@Injectable()
export class EpfoService {
  private readonly logger = new Logger(EpfoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneToUanService: PhoneToUanService,
    private readonly uanToEmploymentService: UanToEmploymentService
  ) {}

  /** --- Parse date from multiple formats to Date object --- */
  private parseFlexibleDate(value: any): Date | null {
    if (!value) return null;
    
    const str = String(value).trim();
    if (!str || str === "-" || str.toUpperCase() === "N/A") return null;

    // DD/MM/YYYY or DD-MM-YYYY format
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }

    // DD-MMM-YYYY format (e.g., "01-JAN-2024")
    const ddmmmyyyyMatch = str.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/i);
    if (ddmmmyyyyMatch) {
      const monthMap: { [key: string]: number } = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
      };
      const day = parseInt(ddmmmyyyyMatch[1], 10);
      const monthStr = ddmmmyyyyMatch[2].toUpperCase();
      const year = parseInt(ddmmmyyyyMatch[3], 10);
      const month = monthMap[monthStr];
      
      if (month !== undefined) {
        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? null : date;
      }
    }

    // ISO format or other standard formats
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  }

  /** --- Format Date to DD/MM/YYYY string --- */
  private formatDateToDDMMYYYY(d: Date | null): string | null {
    if (!d) return null;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear());
    return `${day}/${month}/${year}`;
  }

  /** --- Normalize string values (handle null, empty, N/A, etc.) --- */
  private normalizeString(value: any): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (!str || str === "-" || str.toUpperCase() === "N/A" || str.toUpperCase() === "NA") return null;
    return str;
  }

  /** --- Transform employment data from any provider to consistent format --- */
  private transformEmploymentData(historyItem: any, employeeDetails: any): any {
    // Extract establishment name from multiple possible fields
    const establishmentName = this.normalizeString(
      historyItem.establishment_name ||
      historyItem.establishmentName ||
      historyItem.employer_name ||
      historyItem.employerName
    );

    // Extract customer/employee name
    const customerName = this.normalizeString(
      historyItem.name ||
      historyItem.customerName ||
      employeeDetails?.name
    );

    // Extract member ID
    const memberId = this.normalizeString(
      historyItem.member_id ||
      historyItem.memberId ||
      historyItem.member
    );

    // Extract and parse dates
    const rawJoin = historyItem.date_of_joining || 
                    historyItem.dateOfJoining || 
                    historyItem.joinDate || 
                    historyItem.joiningDate || 
                    historyItem.date;
    
    const rawExit = historyItem.date_of_exit || 
                    historyItem.dateOfExit || 
                    historyItem.exitDate || 
                    historyItem.exit_of;

    const joinDateObj = this.parseFlexibleDate(rawJoin);
    const exitDateObj = this.parseFlexibleDate(rawExit);

    const joiningDate = this.formatDateToDDMMYYYY(joinDateObj);
    const exitDate = this.formatDateToDDMMYYYY(exitDateObj);

    // Extract guardian/father name
    const guardianName = this.normalizeString(
      historyItem.guardian_name ||
      historyItem.guardianName ||
      historyItem.fatherOrHusbandName ||
      historyItem.fatherName ||
      employeeDetails?.fatherName ||
      employeeDetails?.fatherOrHusbandName
    );

    // Extract UAN
    const uan = this.normalizeString(
      historyItem.uan ||
      historyItem.uanNumber ||
      employeeDetails?.uan
    );

    // Return normalized object with both naming conventions
    return {
      // Canonical fields (used for DB storage)
      establishmentName,
      customerName,
      memberId,
      joiningDate,
      exitDate,
      guardianName,
      uan,
      // Also store Date objects for DB
      joiningDateObj: joinDateObj,
      exitDateObj: exitDateObj,
      // Legacy fields for backward compatibility
      establishment_name: establishmentName,
      name: customerName,
      member_id: memberId,
      date_of_joining: joiningDate,
      date_of_exit: exitDate,
      guardian_name: guardianName,
      uanNumber: uan,
    };
  }

  /**
   * Get UAN and flattened employment history.
   */
  async getUanAndHistory(
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string,
    options?: GetUanAndHistoryOptions
  ): Promise<any> {
    // 1. Check database for existing cached record
    try {
      const existingRecord = await this.prisma.kyccart_some_table.findFirst({
        where: { userId, brandId },
      });

      if (existingRecord?.employmentHistory) {
        this.logger.log(`Returning cached employment history for user ${userId}`);
        return {
          success: true,
          data: existingRecord.employmentHistory,
          message: "Employment history retrieved from cache",
        };
      }

      // If caller asked cache-only and there's no cache
      if (options?.cacheOnly) {
        this.logger.log(`No cache found for user ${userId}, returning empty`);
        return {
          success: false,
          data: null,
          message: "No cached employment history",
        };
      }
    } catch (dbErr) {
      this.logger.error("Failed to read cache from kyccart_some_table", dbErr);
    }

    // 2. Load user to get phone number
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      throw new NotFoundException(`No phone number found for user ${userId}`);
    }

    const mobileNumber = user.phoneNumber.replace(/^(\+91|91)/, "").slice(-10);
    if (!/^\d{10}$/.test(mobileNumber)) {
      throw new InternalServerErrorException(
        `Invalid mobile number format: ${user.phoneNumber}`
      );
    }

    try {
      // 3. Check if we should use Digitap (which doesn't need UAN lookup)
      const shouldUseDigitap =
        await this.shouldUseDigitapForEmployment(brandId);
      let uanList: string[] = [];
      let uanResponse: any = null;

      if (!shouldUseDigitap) {
        // Normal UAN lookup flow for other providers
        this.logger.log(
          `Fetching UAN for mobile: ${mobileNumber} (non-Digitap provider)`
        );
        uanResponse = await this.phoneToUanService.getUanByPhoneWithFallback(
          brandId,
          { mobileNumber, checkId, groupId },
          userId
        );

      // this.logger.debug(`UAN Response:`, {
      //   success: uanResponse?.success,
      //   uan: uanResponse?.uan,
      //   uanList: uanResponse?.uanList,
      //   message: uanResponse?.message,
      //   provider: uanResponse?.provider
      // });

        if (!uanResponse?.success) {
          throw new NotFoundException(
            uanResponse?.message ||
              "Failed to find UAN for the provided mobile number."
          );
        }

        // Handle both single UAN and UAN list
        if (uanResponse.uanList && uanResponse.uanList.length > 0) {
          uanList = uanResponse.uanList;
        } else if (uanResponse.uan) {
          uanList = [uanResponse.uan];
        }

        if (uanList.length === 0) {
          throw new NotFoundException(
            "No UAN found for the provided mobile number."
          );
        }

        this.logger.log(
          `Found ${uanList.length} UAN(s): ${uanList.join(", ")}`
        );
      } else {
        // For Digitap, we don't need UAN - use a dummy value and log it
        uanList = ["DIGITAP_NO_UAN_NEEDED"];
        this.logger.log(
          `Using Digitap provider - skipping UAN lookup, using mobile: ${mobileNumber}`
        );
      }

      // 4. For each UAN (or dummy UAN for Digitap), fetch employment history
      const allHistoryResults: any[] = [];
      const flattenedEmploymentHistory: any[] = [];

      // Add a safety check to prevent empty UAN processing
      if (!uanList || uanList.length === 0) {
        this.logger.warn("No UAN list available for processing");
        return {
          success: false,
          data: {
            mobileNo: mobileNumber,
            employmentHistory: [],
            rawResults: [],
            totalRecords: 0,
          },
          message: "No UAN found for processing",
        };
      }

      for (const uan of uanList) {
        if (!uan || typeof uan !== "string" || uan.trim() === "") {
          this.logger.warn(`Skipping invalid UAN: ${uan}`);
          continue;
        }

        try {
          this.logger.log(
            `Fetching employment history for ${shouldUseDigitap ? "mobile" : "UAN"}: ${shouldUseDigitap ? mobileNumber : uan}`
          );

          const historyRequest = {
            uan: uan,
            pan: null,
            mobile: shouldUseDigitap ? mobileNumber : null, // Pass mobile only for Digitap
            dob: null,
            employeeName: null,
            checkId,
            groupId,
          };

          const historyResponse =
            await this.uanToEmploymentService.getEmploymentHistoryByUanWithFallback(
              brandId,
              historyRequest,
              userId
            );

          // this.logger.debug(`Employment history response:`, {
          //   success: historyResponse?.success,
          //   employmentHistoryCount:
          //     historyResponse?.employmentHistory?.length || 0,
          //   provider: historyResponse?.provider,
          //   message: historyResponse?.message,
          // });

          allHistoryResults.push(historyResponse);

          if (
            historyResponse?.success &&
            Array.isArray(historyResponse.employmentHistory)
          ) {
            this.logger.log(
              `Processing ${historyResponse.employmentHistory.length} employment records for ${shouldUseDigitap ? "mobile" : "UAN"} ${shouldUseDigitap ? mobileNumber : uan}`
            );

            historyResponse.employmentHistory.forEach(
              (item: any, index: number) => {
                try {
                  const transformedItem = this.transformEmploymentData(
                    item,
                    historyResponse.employeeDetails || item.employeeDetails
                  );

                  flattenedEmploymentHistory.push(transformedItem);
                } catch (transformError) {
                  this.logger.error(
                    `Failed to transform employment record ${index + 1} for ${shouldUseDigitap ? "mobile" : "UAN"} ${shouldUseDigitap ? mobileNumber : uan}:`,
                    transformError
                  );
                }
              }
            );
          } else if (historyResponse?.success === false) {
            this.logger.warn(
              `Employment history lookup failed for ${shouldUseDigitap ? "mobile" : "UAN"} ${shouldUseDigitap ? mobileNumber : uan}: ${historyResponse.message}`
            );
          }
        } catch (historyError) {
          this.logger.error(
            `Failed to get history for ${shouldUseDigitap ? "mobile" : "UAN"} ${shouldUseDigitap ? mobileNumber : uan}:`,
            {
              error: historyError?.message || String(historyError),
              stack: historyError?.stack,
            }
          );
          allHistoryResults.push({
            success: false,
            employmentHistory: [],
            employeeDetails: null,
            message: `Failed to fetch history for ${shouldUseDigitap ? "mobile" : "UAN"} ${shouldUseDigitap ? mobileNumber : uan}: ${historyError?.message || String(historyError)}`,
            provider: null,
            raw: null,
          });
        }
      }

      this.logger.log(
        `Total employment records collected: ${flattenedEmploymentHistory.length}`
      );

      // 5. Persist individual previous_employments rows
      if (flattenedEmploymentHistory.length > 0) {
        try {
          const employmentRecords = flattenedEmploymentHistory
            .filter((item) => {
              // Only store records with meaningful data
              const hasData =
                item.establishmentName ||
                item.customerName ||
                item.memberId ||
                item.uan;
              if (!hasData) {
                this.logger.warn(`Skipping empty employment record`);
              }
              return hasData;
            })
            .map((item, index) => {
              try {
                return {
                  id: uuidv4(),
                  userId,
                  brandId,
                  customerName: item.customerName || "Unknown",
                  uanNumber: item.uan,
                  memberId: item.memberId,
                  joiningDate: item.joiningDateObj,
                  exitDate: item.exitDateObj,
                  guardianName: item.guardianName,
                  establishmentName: item.establishmentName,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              } catch (recordError) {
                this.logger.error(
                  `Error creating employment record ${index}:`,
                  recordError
                );
                throw recordError;
              }
            });

          if (employmentRecords.length > 0) {
            this.logger.log(
              `Persisting ${employmentRecords.length} employment records to database`
            );
            await this.prisma.previous_employments.createMany({
              data: employmentRecords,
              skipDuplicates: true,
            });
            this.logger.log(`Successfully persisted employment records`);
          }
        } catch (persistErr) {
          this.logger.error("Failed to persist previous_employments:", {
            error: persistErr?.message || String(persistErr),
            stack: persistErr?.stack,
            userId,
            brandId,
            recordsCount: flattenedEmploymentHistory.length,
          });
          // Don't throw, just continue
        }
      }

      // 6. Build response and write to cache
      this.logger.log(
        `Building final response with ${flattenedEmploymentHistory.length} employment records`
      );

      let responseData;
      try {
        responseData = {
          mobileNo: mobileNumber,
          employmentHistory: flattenedEmploymentHistory.map((item, index) => {
            try {
              return {
                establishment_name: item.establishmentName,
                name: item.customerName,
                member_id: item.memberId,
                date_of_joining: item.joiningDate,
                date_of_exit: item.exitDate,
                guardian_name: item.guardianName,
                uan: item.uan,
              };
            } catch (mapError) {
              this.logger.error(
                `Error mapping employment record ${index}:`,
                mapError
              );
              return {
                establishment_name: null,
                name: null,
                member_id: null,
                date_of_joining: null,
                date_of_exit: null,
                guardian_name: null,
                uan: null,
              };
            }
          }),
          rawResults: allHistoryResults,
          totalRecords: flattenedEmploymentHistory.length,
        };
      } catch (responseError) {
        this.logger.error("Error building response data:", responseError);
        throw new InternalServerErrorException(
          "Failed to build employment history response"
        );
      }

      // Determine success based on actual data
      const hasEmploymentData = flattenedEmploymentHistory.length > 0;
      const hasSuccessfulProvider = allHistoryResults.some(
        (result) => result?.success === true
      );
      const isSuccess = hasEmploymentData || hasSuccessfulProvider;

      // Determine appropriate message
      let finalMessage = "Employment history retrieved successfully";
      if (!hasEmploymentData) {
        finalMessage = "No employment history found for the User";
      }

      try {
        await this.prisma.kyccart_some_table.create({
          data: {
            userId,
            brandId,
            employmentHistory: responseData,
          },
        });
        this.logger.log(
          `Successfully cached employment history for user ${userId}`
        );
      } catch (cacheWriteErr) {
        this.logger.warn(
          "Failed to write employmentHistory to kyccart_some_table:",
          {
            error: cacheWriteErr?.message || String(cacheWriteErr),
            userId,
            brandId,
          }
        );
      }

      return {
        success: isSuccess,
        data: responseData,
        message: finalMessage,
      };
    } catch (error: any) {
      this.logger.error("EPFO data retrieval failed:", {
        message: error?.message || String(error),
        stack: error?.stack,
        status: error?.status,
        response: error?.response?.data,
        userId,
        brandId,
        mobileNumber,
      });

      // If it's already an HTTP exception, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // For any other error, wrap it in an InternalServerErrorException
      throw new InternalServerErrorException(
        error?.message ||
          "An unexpected error occurred during EPFO data retrieval. Please try again later."
      );
    }
  }

  /** --- Check if Digitap is the configured UAN-to-employment provider --- */
  private async shouldUseDigitapForEmployment(
    brandId: string
  ): Promise<boolean> {
    try {
      const providers = await this.prisma.brandProvider.findMany({
        where: {
          brandId,
          type: BrandProviderType.UAN_TO_EMPLOYMENT,
          isActive: true,
          isDisabled: false,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      });

      // Check if Digitap is among the active providers (primary or fallback)
      const digitapProvider = providers.find(
        (provider) => provider.provider === BrandProviderName.DIGITAP
      );

      const shouldUse = Boolean(digitapProvider);
      this.logger.debug(
        `Digitap provider check - available: ${shouldUse}, total providers: ${providers.length}`
      );

      return shouldUse;
    } catch (error) {
      this.logger.error("Error checking Digitap provider:", error);
      return false;
    }
  }

  async getUanAndHistoryWithAlternatePhone(
    userId: string,
    brandId: string,
    mobileNumber: string, // Accept the mobile number directly
    checkId?: string,
    groupId?: string,
    options?: GetUanAndHistoryOptions
  ): Promise<any> {
    const normalizedMobileNumber = mobileNumber.replace(/^(\+91|91)/, "").slice(-10);
    
    this.logger.log(`Fetching EPFO data for user ${userId} with alternate number: ${normalizedMobileNumber}`);

    try {
      // 1. Check database for existing cached record (optional, based on your logic)
      const existingRecord = await this.prisma.kyccart_some_table.findFirst({
        where: { userId, brandId },
      });

      if (existingRecord?.employmentHistory) {
        this.logger.log(`Returning cached employment history for user ${userId}`);
        return {
          success: true,
          data: existingRecord.employmentHistory,
          message: "Employment history retrieved from cache",
        };
      }

      if (options?.cacheOnly) {
        this.logger.log(`No cache found for user ${userId}, returning empty`);
        return {
          success: false,
          data: null,
          message: "No cached employment history",
        };
      }
      
      // 2. Get UAN list using phone-to-uan service with the alternate number
      this.logger.log(`Fetching UAN for alternate mobile: ${normalizedMobileNumber}`);
      const uanResponse = await this.phoneToUanService.getUanByPhoneWithFallback(
        brandId,
        { mobileNumber: normalizedMobileNumber, checkId, groupId },
        userId
      );

      this.logger.debug(`UAN Response:`, {
        success: uanResponse?.success,
        uan: uanResponse?.uan,
        uanList: uanResponse?.uanList,
        message: uanResponse?.message,
        provider: uanResponse?.provider
      });

      if (!uanResponse?.success) {
        throw new NotFoundException(
          uanResponse?.message || "Failed to find UAN for the provided mobile number."
        );
      }

      let uanList: string[] = [];
      if (uanResponse.uanList && uanResponse.uanList.length > 0) {
        uanList = uanResponse.uanList;
      } else if (uanResponse.uan) {
        uanList = [uanResponse.uan];
      }

      if (uanList.length === 0) {
        throw new NotFoundException("No UAN found for the provided alternate mobile number.");
      }

      this.logger.log(`Found ${uanList.length} UAN(s): ${uanList.join(", ")}`);

      // 3. For each UAN, fetch employment history (reuse existing logic)
      const allHistoryResults: any[] = [];
      const flattenedEmploymentHistory: any[] = [];

      for (const uan of uanList) {
        if (!uan || typeof uan !== 'string' || uan.trim() === '') {
          this.logger.warn(`Skipping invalid UAN: ${uan}`);
          continue;
        }

        try {
          this.logger.log(`Fetching employment history for UAN: ${uan}`);
          const historyResponse = await this.uanToEmploymentService.getEmploymentHistoryByUanWithFallback(
            brandId,
            { uan, pan: null, mobile: null, dob: null, employeeName: null, checkId, groupId },
            userId
          );

          allHistoryResults.push(historyResponse);

          if (
            historyResponse?.success &&
            Array.isArray(historyResponse.employmentHistory)
          ) {
            this.logger.log(
              `Processing ${historyResponse.employmentHistory.length} employment records for UAN ${uan}`
            );

            historyResponse.employmentHistory.forEach(
              (item: any, index: number) => {
                try {
                  const transformedItem = this.transformEmploymentData(
                    item,
                    historyResponse.employeeDetails || item.employeeDetails
                  );
                  flattenedEmploymentHistory.push(transformedItem);
                } catch (transformError) {
                  this.logger.error(
                    `Failed to transform employment record ${index + 1} for UAN ${uan}:`,
                    transformError
                  );
                }
              }
            );
          } else if (historyResponse?.success === false) {
            this.logger.warn(
              `Employment history lookup failed for UAN ${uan}: ${historyResponse.message}`
            );
          }
        } catch (historyError) {
          this.logger.error(`Failed to get history for UAN ${uan}:`, {
            error: historyError?.message || String(historyError),
            stack: historyError?.stack,
          });
          allHistoryResults.push({
            success: false,
            employmentHistory: [],
            employeeDetails: null,
            message: `Failed to fetch history for UAN ${uan}: ${historyError?.message || String(historyError)}`,
            provider: null,
            raw: null,
          });
        }
      }

      // 4. Persist individual previous_employments rows
      if (flattenedEmploymentHistory.length > 0) {
        try {
          const employmentRecords = flattenedEmploymentHistory
            .filter((item) => {
              const hasData =
                item.establishmentName ||
                item.customerName ||
                item.memberId ||
                item.uan;
              return hasData;
            })
            .map((item, index) => {
              try {
                return {
                  id: uuidv4(),
                  userId,
                  brandId,
                  customerName: item.customerName || "Unknown",
                  uanNumber: item.uan,
                  memberId: item.memberId,
                  joiningDate: item.joiningDateObj,
                  exitDate: item.exitDateObj,
                  guardianName: item.guardianName,
                  establishmentName: item.establishmentName,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              } catch (recordError) {
                this.logger.error(`Error creating employment record ${index}:`, recordError);
                throw recordError;
              }
            });

          if (employmentRecords.length > 0) {
            this.logger.log(`Persisting ${employmentRecords.length} employment records to database`);
            await this.prisma.previous_employments.createMany({
              data: employmentRecords,
              skipDuplicates: true,
            });
            this.logger.log(`Successfully persisted employment records`);
          }
        } catch (persistErr) {
          this.logger.error("Failed to persist previous_employments:", persistErr);
        }
      }

      // 5. Build response and write to cache
      const responseData = {
        mobileNo: normalizedMobileNumber,
        employmentHistory: flattenedEmploymentHistory.map((item) => ({
          establishment_name: item.establishmentName,
          name: item.customerName,
          member_id: item.memberId,
          date_of_joining: item.joiningDate,
          date_of_exit: item.exitDate,
          guardian_name: item.guardianName,
          uan: item.uan,
        })),
        rawResults: allHistoryResults,
        totalRecords: flattenedEmploymentHistory.length,
      };

      try {
        await this.prisma.kyccart_some_table.create({
          data: {
            userId,
            brandId,
            employmentHistory: responseData,
          },
        });
        this.logger.log(`Successfully cached employment history for user ${userId}`);
      } catch (cacheWriteErr) {
        this.logger.warn("Failed to write employmentHistory to kyccart_some_table:", cacheWriteErr);
      }

      return {
        success: true,
        data: responseData,
        message: "Employment history retrieved successfully using alternate number",
      };

    } catch (error: any) {
      this.logger.error("EPFO data retrieval with alternate phone failed:", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || "An unexpected error occurred during EPFO data retrieval with alternate phone."
      );
    }
  }

  /**
   * Diagnostic method to test UAN lookup only (for debugging)
   */
  async testUanLookupOnly(
    userId: string,
    brandId: string,
    checkId?: string,
    groupId?: string
  ): Promise<any> {
    try {
      // Load user to get phone number
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true },
      });

      if (!user?.phoneNumber) {
        throw new NotFoundException(`No phone number found for user ${userId}`);
      }

      const mobileNumber = user.phoneNumber
        .replace(/^(\+91|91)/, "")
        .slice(-10);
      if (!/^\d{10}$/.test(mobileNumber)) {
        throw new InternalServerErrorException(
          `Invalid mobile number format: ${user.phoneNumber}`
        );
      }

      this.logger.log(`Testing UAN lookup for mobile: ${mobileNumber}`);
      
      // Get UAN list using phone-to-uan service with fallback
      const uanResponse = await this.phoneToUanService.getUanByPhoneWithFallback(
        brandId,
        { mobileNumber, checkId, groupId },
        userId
      );

      return {
        success: true,
        data: {
          mobileNumber,
          uanResponse,
        },
        message: "UAN lookup test completed successfully",
      };
    } catch (error: any) {
      this.logger.error("UAN lookup test failed:", error);
      throw error;
    }
  }
}
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryLeadFormsDto } from './dto/leadForm.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class LeadFormsService {
  private readonly logger = new Logger(LeadFormsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async uploadCsvFile(brandId: string, file: Express.Multer.File) {
    this.logger.log(`Starting CSV upload for brand: ${brandId}`);
    
    this.validateFileInput(file);

    try {
      const csvContent = file.buffer.toString('utf-8');
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
      
      this.logger.log(`CSV has ${lines.length} lines`);
      this.validateCsvContent(lines);

      const header = this.parseCSVLine(lines[0]);
      this.logger.debug('CSV Header:', header);
      
      const { results, errors } = await this.processCsvRows(lines, header, brandId);
      const successCount = await this.insertCsvData(results);
      
      return this.buildUploadResult(results.length, successCount, errors);
    } catch (error) {
      this.logger.error('Error processing CSV:', error);
      throw new BadRequestException(`Failed to process CSV: ${error.message}`);
    }
  }

  private validateFileInput(file: Express.Multer.File): void {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }
  }

  private validateCsvContent(lines: string[]): void {
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must have at least a header and one data row');
    }
  }

  private async processCsvRows(lines: string[], header: string[], brandId: string) {
    const results: any[] = [];
    const errors: string[] = [];

    this.logger.log(`Processing CSV with ${lines.length - 1} data rows`);

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const rowData = this.mapCsvRowToData(header, values, brandId);
        if (rowData) {
          results.push(rowData);
        }
      } catch (error) {
        this.logger.warn(`Error processing row ${i}: ${error.message}`);
        errors.push(`Row ${i}: ${error.message}`);
      }
    }

    if (results.length === 0) {
      throw new BadRequestException('No valid data found in CSV file');
    }

    return { results, errors };
  }

  private async insertCsvData(results: any[]): Promise<number> {
    let successCount = 0;
    
    for (const item of results) {
      try {
        await this.prisma.$executeRaw`
          INSERT INTO lead_forms (
            id, "brandId", "createdTime", ad_id, ad_name, adset_id, adset_name, 
            campaign_id, campaign_name, form_id, form_name, is_organic, 
            platform, are_you_a_salaried_employee, what_is_your_monthly_salary, 
            enter_your_pan_no, email, full_name, phone, street_address, 
            city, "uploadedAt", status, "createdAt", "updatedAt"
          ) VALUES (
            ${item.id}, ${item.brandId}, ${item.createdTime}, ${item.adId}, ${item.adName}, 
            ${item.adsetId}, ${item.adsetName}, ${item.campaignId}, ${item.campaignName}, 
            ${item.formId}, ${item.formName}, ${item.isOrganic}, ${item.platform}, 
            ${item.areYouASalariedEmployee}, ${item.whatIsYourMonthlySalary}, ${item.enterYourPanNo}, 
            ${item.email}, ${item.fullName}, ${item.phone}, ${item.streetAddress}, ${item.city}, 
            NOW(), 'PENDING', NOW(), NOW()
          ) ON CONFLICT DO NOTHING
        `;
        successCount++;
      } catch (insertError) {
        this.logger.warn(`Failed to insert row: ${insertError.message}`);
      }
    }
    
    return successCount;
  }

  private buildUploadResult(totalRows: number, successCount: number, errors: string[]) {
    return {
      message: 'CSV uploaded successfully',
      totalRows,
      processedRows: successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Handle escaped quotes ("")
          current += '"';
          i += 2;
          continue;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    result.push(current.trim());
    return result.map(field => {
      // Remove quotes from beginning and end of field
      return field.replace(/^"/, '').replace(/"$/, '').trim();
    });
  }

  private mapCsvRowToData(header: string[], values: string[], brandId: string) {
    const data: any = { brandId };
    this.logger.debug('Mapping CSV row:', { header, values });
    
    const fieldMap = this.getFieldMappings();

    for (let i = 0; i < header.length && i < values.length; i++) {
      const csvField = header[i].toLowerCase().trim();
      const mappedField = fieldMap[csvField];
      const value = values[i]?.trim();

      if (mappedField && value) {
        data[mappedField] = this.transformValue(mappedField, value);
      }
    }

    // Ensure we have a valid ID - if not provided from CSV, generate one
    if (!data.id) {
      // Generate a UUID using randomUUID()
      data.id = randomUUID();
    }

    this.validateRequiredFields(data);
    return data;
  }

  private getFieldMappings(): { [key: string]: string } {
    return {
      'id': 'id',
      'created_time': 'createdTime',
      'ad_id': 'adId',
      'ad_name': 'adName',
      'adset_id': 'adsetId',
      'adset_name': 'adsetName',
      'campaign_id': 'campaignId',
      'campaign_name': 'campaignName',
      'form_id': 'formId',
      'form_name': 'formName',
      'is_organic': 'isOrganic',
      'platform': 'platform',
      'are_you_a_salaried_employee?': 'areYouASalariedEmployee',
      'are_you_a_salaried_employee': 'areYouASalariedEmployee',
      'what_is_your_monthly_salary?': 'whatIsYourMonthlySalary',
      'what_is_your_monthly_salary': 'whatIsYourMonthlySalary',
      'enter_your_pan_no.?': 'enterYourPanNo',
      'enter_your_pan_no': 'enterYourPanNo',
      'email': 'email',
      'full_name': 'fullName',
      'phone': 'phone',
      'street_address': 'streetAddress',
      'city': 'city'
    };
  }

  private transformValue(mappedField: string, value: string): any {
    if (mappedField === 'createdTime') {
      return this.parseDate(value);
    }
    
    if (mappedField === 'isOrganic') {
      return this.parseBoolean(value);
    }
    
    return value ?? null;
  }

  private parseDate(value: string): Date | null {
    try {
      const dateValue = value.includes('/') 
        ? new Date(value.replace(/(\d+)\/(\d+)\/(\d+)/, (_, m, d, y) => {
            const year = y.length === 2 ? `20${y}` : y;
            return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }))
        : new Date(value);
      return dateValue;
    } catch {
      return null;
    }
  }

  private validateRequiredFields(data: any): void {
    if (!data.email && !data.phone) {
      throw new Error('Either email or phone is required');
    }

    if (!data.fullName) {
      throw new Error('Full name is required');
    }
  }

  private parseBoolean(value: string): boolean | null {
    if (!value) return null;
    
    const stringValue = value.toLowerCase().trim();
    if (stringValue === 'true' || stringValue === '1' || stringValue === 'yes') return true;
    if (stringValue === 'false' || stringValue === '0' || stringValue === 'no') return false;
    
    return null;
  }

  async getLeadForms(brandId: string, query: QueryLeadFormsDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    let whereClause = `"brandId" = '${brandId}'`;
    
    if (query.status) {
      whereClause += ` AND status = '${query.status}'`;
    }

    if (query.search) {
      whereClause += ` AND (email ILIKE '%${query.search}%' OR full_name ILIKE '%${query.search}%' OR phone ILIKE '%${query.search}%')`;
    }

    if (query.fromDate) {
      whereClause += ` AND "createdAt" >= '${query.fromDate}'`;
    }

    if (query.toDate) {
      whereClause += ` AND "createdAt" <= '${query.toDate}'`;
    }

    const [leadForms, totalResult] = await Promise.all([
      this.prisma.$queryRawUnsafe(`
        SELECT 
          lf.*,
          COALESCE(lm.match_count, 0)::integer as lead_matches
        FROM lead_forms lf
        LEFT JOIN (
          SELECT 
            "leadFormId",
            COUNT(*)::integer as match_count
          FROM lead_matches 
          WHERE status = 'ACTIVE'
          GROUP BY "leadFormId"
        ) lm ON lf.id = lm."leadFormId"
        WHERE ${whereClause}
        ORDER BY lf."createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `),
      this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::integer as count FROM lead_forms 
        WHERE ${whereClause}
      `)
    ]);

    const total = (totalResult as any[])[0]?.count || 0;

    return {
      data: (leadForms as any[]).map(form => ({
        ...form,
        // Ensure proper field mapping for frontend
        fullName: form.full_name,
        createdAt: form.createdAt || form.uploadedAt,
        // Ensure lead_matches is properly serialized as integer
        lead_matches: parseInt(form.lead_matches) || 0,
      })),
      total: parseInt(total),
      page,
      limit,
    };
  }

  async getLeadFormById(brandId: string, id: string) {
    const leadForm = await this.prisma.$queryRaw`
      SELECT * FROM lead_forms 
      WHERE "brandId" = ${brandId} AND id = ${id}
      LIMIT 1
    `;

    const forms = leadForm as any[];
    
    if (forms.length === 0) {
      throw new BadRequestException('Lead form not found');
    }

    const form = forms[0];

    // Get user matches from unified table
    const userMatches = await this.prisma.$queryRaw`
      SELECT 
        lm.id, lm."matchType", lm."matchField", lm."matchValue", 
        lm.confidence, lm.status, lm."createdAt",
        u.id as "userId", u.email as "userEmail", u."phoneNumber" as "userPhone",
        ud."firstName", ud."lastName", ud."dateOfBirth"
      FROM lead_matches lm
      JOIN users u ON lm."userId" = u.id
      LEFT JOIN user_details ud ON u.id = ud."userId"
      WHERE lm."leadFormId" = ${id} AND lm."entityType" = 'USER' AND lm.status = 'ACTIVE'
      ORDER BY lm.confidence DESC, lm."createdAt" DESC
    `;

    // Get document matches from unified table
    const documentMatches = await this.prisma.$queryRaw`
      SELECT 
        lm.id, lm."matchType", lm."matchField", lm."matchValue", 
        lm.confidence, lm.status, lm."createdAt",
        d.id as "documentId", d."documentNumber", d.type as "documentType",
        u.id as "userId", u.email as "userEmail", u."phoneNumber" as "userPhone",
        ud."firstName", ud."lastName"
      FROM lead_matches lm
      JOIN documents d ON lm."documentId" = d.id
      JOIN users u ON d."userId" = u.id
      LEFT JOIN user_details ud ON u.id = ud."userId"
      WHERE lm."leadFormId" = ${id} AND lm."entityType" = 'DOCUMENT' AND lm.status = 'ACTIVE'
      ORDER BY lm.confidence DESC, lm."createdAt" DESC
    `;
    
    return {
      ...form,
      // Ensure proper field mapping for frontend
      fullName: form.full_name,
      createdAt: form.createdAt || form.uploadedAt,
      userMatches: userMatches as any[],
      documentMatches: documentMatches as any[],
    };
  }

  async syncToDatabase(brandId: string, leadFormIds?: string[]) {
    let whereClause = `"brandId" = '${brandId}' AND status = 'PENDING'`;
    
    if (leadFormIds?.length) {
      const ids = leadFormIds.map(id => `'${id}'`).join(',');
      whereClause += ` AND id IN (${ids})`;
    }

    // Get all lead forms first (outside transaction)
    const leadForms = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM lead_forms WHERE ${whereClause}
    `) as any[];

    this.logger.log(`Found ${leadForms.length} lead forms to sync`);

    const results = {
      processed: 0,
      failed: 0,
      duplicates: 0,
      userMatches: 0,
      documentMatches: 0,
      errors: [] as string[],
    };

    // Pre-load all users and documents for this brand (outside transaction)
    const [allUsers, allDocuments] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT u.id, u.email, u."phoneNumber", ud."firstName", ud."lastName", ud."dateOfBirth"
        FROM users u
        LEFT JOIN user_details ud ON u.id = ud."userId"
        WHERE u."brandId" = ${brandId}
      `,
      this.prisma.$queryRaw`
        SELECT d.id, d."documentNumber", d.type, d."userId",
               u.email, u."phoneNumber", ud."firstName", ud."lastName"
        FROM documents d
        JOIN users u ON d."userId" = u.id
        LEFT JOIN user_details ud ON u.id = ud."userId"
        WHERE u."brandId" = ${brandId}
      `
    ]);

    this.logger.log(`Pre-loaded ${(allUsers as any[]).length} users and ${(allDocuments as any[]).length} documents for matching`);

    // Process in smaller batches with separate transactions
    const batchSize = 3; // Reduced batch size for faster processing
    for (let i = 0; i < leadForms.length; i += batchSize) {
      const batch = leadForms.slice(i, i + batchSize);
      
      // Process each lead form in the batch sequentially to avoid transaction timeouts
      for (const leadForm of batch) {
        try {
          await this.processSingleLeadForm(leadForm, brandId, allUsers as any[], allDocuments as any[], results);
        } catch (error) {
          this.logger.error(`Error processing lead form ${leadForm.id}:`, error);
          results.failed++;
          results.errors.push(`Lead form ${leadForm.id}: ${error.message}`);
          
          // Mark as failed in a separate quick transaction
          try {
            await this.prisma.$executeRaw`
              UPDATE lead_forms 
              SET status = 'FAILED', 
                  "errorMessage" = ${error.message}, 
                  "processedAt" = NOW() 
              WHERE id = ${leadForm.id}
            `;
          } catch (updateError) {
            this.logger.error(`Failed to update error status for lead form ${leadForm.id}:`, updateError);
          }
        }
      }
    }

    return results;
  }

  private async processSingleLeadForm(
    leadForm: any, 
    brandId: string, 
    allUsers: any[], 
    allDocuments: any[], 
    results: any
  ) {
    // Use a shorter transaction for each lead form
    return await this.prisma.$transaction(async (prisma) => {
      // Check for duplicates
      if (leadForm.email || leadForm.phone) {
        let duplicateQuery = `
          SELECT id FROM lead_forms 
          WHERE "brandId" = '${brandId}' 
          AND id != '${leadForm.id}'
        `;
        
        if (leadForm.email && leadForm.phone) {
          duplicateQuery += ` AND (email = '${leadForm.email}' OR phone = '${leadForm.phone}')`;
        } else if (leadForm.email) {
          duplicateQuery += ` AND email = '${leadForm.email}'`;
        } else if (leadForm.phone) {
          duplicateQuery += ` AND phone = '${leadForm.phone}'`;
        }
        
        duplicateQuery += ` LIMIT 1`;
        
        const duplicate = await prisma.$queryRawUnsafe(duplicateQuery) as any[];

        if (duplicate.length > 0) {
          await prisma.$executeRaw`
            UPDATE lead_forms 
            SET status = 'DUPLICATE', 
                "errorMessage" = ${`Duplicate found: ${duplicate[0].id}`}, 
                "processedAt" = NOW() 
            WHERE id = ${leadForm.id}
          `;
          results.duplicates++;
          return;
        }
      }

      // Find matching users and documents using pre-loaded data
      const matchResults = this.findMatchingUsersAndDocumentsFromCache(leadForm, allUsers, allDocuments);
      
      // Create relationship records for each match
      for (const userMatch of matchResults.userMatches) {
        await this.createUserMatchInTransaction(prisma, leadForm.id, userMatch, brandId);
        results.userMatches++;
      }

      for (const documentMatch of matchResults.documentMatches) {
        await this.createDocumentMatchInTransaction(prisma, leadForm.id, documentMatch, brandId);
        results.documentMatches++;
      }

      // Mark as processed
      await prisma.$executeRaw`
        UPDATE lead_forms 
        SET status = 'PROCESSED', "processedAt" = NOW() 
        WHERE id = ${leadForm.id}
      `;

      results.processed++;
    }, {
      maxWait: 10000, // 10 seconds max wait
      timeout: 30000, // 30 seconds timeout per lead form
    });
  }

  // New method to use cached data instead of querying in transaction
  private findMatchingUsersAndDocumentsFromCache(
    leadForm: any, 
    allUsers: any[], 
    allDocuments: any[]
  ): { userMatches: any[]; documentMatches: any[] } {
    const userMatches: any[] = [];
    const documentMatches: any[] = [];

    // Exact matching logic using cached data
    for (const user of allUsers) {
      // Email match
      if (leadForm.email && user.email && leadForm.email.toLowerCase() === user.email.toLowerCase()) {
        userMatches.push({
          userId: user.id,
          matchType: 'EXACT',
          matchField: 'EMAIL',
          matchValue: leadForm.email,
          confidence: 1.0,
        });
      }

      // Phone match
      if (leadForm.phone && user.phoneNumber && leadForm.phone === user.phoneNumber) {
        userMatches.push({
          userId: user.id,
          matchType: 'EXACT',
          matchField: 'PHONE',
          matchValue: leadForm.phone,
          confidence: 1.0,
        });
      }
    }

    // Document matching logic using cached data
    for (const doc of allDocuments) {
      // PAN match
      const leadPan = leadForm.enter_your_pan_no || leadForm.panNumber;
      if (leadPan && doc.documentNumber && doc.type === 'PAN' && 
          leadPan.toUpperCase() === doc.documentNumber.toUpperCase()) {
        documentMatches.push({
          documentId: doc.id,
          matchType: 'EXACT',
          matchField: 'PAN',
          matchValue: leadPan,
          confidence: 1.0,
        });
      }
    }

    return { userMatches, documentMatches };
  }

  // Transaction-compatible user match creation
  private async createUserMatchInTransaction(
    prisma: any,
    leadFormId: string, 
    match: any, 
    brandId: string
  ) {
    await prisma.$executeRaw`
      INSERT INTO lead_matches (
        id, "leadFormId", "brandId", "entityType", "userId", "matchType", "matchField", 
        "matchValue", confidence, status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${leadFormId}, ${brandId}, 'USER'::"LeadMatchEntity", ${match.userId}, 
        ${match.matchType}::"LeadMatchType", ${match.matchField}::"LeadMatchField", ${match.matchValue}, 
        ${match.confidence}, 'ACTIVE'::"LeadMatchStatus", NOW(), NOW()
      ) ON CONFLICT ("leadFormId", "entityType", "userId", "documentId", "matchField") DO UPDATE SET
        "matchType" = ${match.matchType}::"LeadMatchType",
        "matchValue" = ${match.matchValue},
        confidence = ${match.confidence},
        "updatedAt" = NOW()
    `;
  }

  // Transaction-compatible document match creation  
  private async createDocumentMatchInTransaction(
    prisma: any,
    leadFormId: string, 
    match: any, 
    brandId: string
  ) {
    await prisma.$executeRaw`
      INSERT INTO lead_matches (
        id, "leadFormId", "brandId", "entityType", "documentId", "matchType", "matchField", 
        "matchValue", confidence, status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${leadFormId}, ${brandId}, 'DOCUMENT'::"LeadMatchEntity", ${match.documentId}, 
        ${match.matchType}::"LeadMatchType", ${match.matchField}::"LeadMatchField", ${match.matchValue}, 
        ${match.confidence}, 'ACTIVE'::"LeadMatchStatus", NOW(), NOW()
      ) ON CONFLICT ("leadFormId", "entityType", "userId", "documentId", "matchField") DO UPDATE SET
        "matchType" = ${match.matchType}::"LeadMatchType",
        "matchValue" = ${match.matchValue},
        confidence = ${match.confidence},
        "updatedAt" = NOW()
    `;
  }

  async getStats(brandId: string) {
    const stats = await this.prisma.$queryRaw`
      SELECT status, COUNT(*)::integer as count 
      FROM lead_forms 
      WHERE "brandId" = ${brandId}
      GROUP BY status
    `;

    const totalQuery = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::integer as count FROM lead_forms WHERE "brandId" = ${brandId}`;

    const totalCount = totalQuery[0].count;

    const statusCounts = (stats as any[]).reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalCount,
      pending: statusCounts.pending || 0,
      processed: statusCounts.processed || 0,
      failed: statusCounts.failed || 0,
      duplicates: statusCounts.duplicate || 0,
    };
  }

  async deleteBulkLeadForms(brandId: string, ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No IDs provided');
    }

    const idsString = ids.map(id => `'${id}'`).join(',');
    
    await this.prisma.$executeRawUnsafe(`
      DELETE FROM lead_forms 
      WHERE "brandId" = '${brandId}' AND id IN (${idsString})
    `);

    return { message: `Deleted ${ids.length} lead forms successfully` };
  }
}

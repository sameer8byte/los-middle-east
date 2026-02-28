import { Test, TestingModule } from '@nestjs/testing';
import { BrandRulesValidationService } from './brand-rules-validation.service';
import { LoanApplicationDto } from './dto/loan-application.dto';

// ─────────────────────────────────────────────────────────────────────────────
//  USAGE EXAMPLES — BrandRulesValidationService
//
//  Covers:
//    1. Basic usage — inject and call validate()
//    2. Full APPROVED case
//    3. Full REJECTED case
//    4. Brand-specific rule differences (same applicant, different brands)
//    5. Disabled checks (SKIPPED) per brand
//    6. List available brands
//    7. Invalid brand ID error handling
//    8. Partial payload — only send fields relevant to brand's enabled checks
//    9. Real-world controller usage pattern
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1 — Basic inject + call pattern (e.g. inside another service)
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';

@Injectable()
export class LoanApplicationService {

  // Inject BrandRulesValidationService via constructor
  constructor(
    private readonly brandRulesValidationService: BrandRulesValidationService,
  ) {}

  async applyForLoan(brandId: string, applicationData: LoanApplicationDto) {
    // Run brand-specific validation
    const result = this.brandRulesValidationService.validate(brandId, applicationData);

    if (result.overallStatus === 'APPROVED') {
      // proceed with loan processing...
      return { status: 'PROCESSING', applicationId: result.applicationId };
    }

    // Return which specific params caused rejection
    return {
      status: 'REJECTED',
      applicationId: result.applicationId,
      reasons: result.failedParams,
    };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2 — APPROVED: all checks pass for BRAND_001 (QuickLoan Finance)
// ─────────────────────────────────────────────────────────────────────────────

async function example_approved() {
  const service = await bootstrapService();

  const dto: LoanApplicationDto = {
    profession:          'SALARIED',
    salaryThreshold:     'ABOVE',       // above BRAND_001's ₹25,000 threshold
    phoneNumber:         '9876543210',
    panCard:             'ABCPE1234F',
    panAadharLinked:     'YES',
    aadharLast4Received: 'YES',
    age:                 32,            // within 21–55 for BRAND_001
    pinCodeStatus:       'COMPLIANT',
    ifscStatus:          'VALID',
    nameMatchPanBank:    90,            // above 75% for BRAND_001
    bankStatementStatus: 'ORIGINAL',
    videoStatus:         'NORMAL',
    aadharPanDigitMatch: 'MATCH',
    genderMatch:         'MATCH',
    nameMatchPanAadhar:  88,            // above 75% for BRAND_001
    nbfcStatus:          'DIFFERENT',
    crifScore:           720,           // above 500 for BRAND_001
    crifReportStatus:    'NON_DELINQUENT',
    brandLoanStatus:     'NON_DEFAULT',
  };

  const result = service.validate('BRAND_001', dto);

  console.log(result);
  // {
  //   applicationId:  "uuid",
  //   timestamp:      "2024-01-01T10:00:00.000Z",
  //   brandId:        "BRAND_001",
  //   brandName:      "QuickLoan Finance",
  //   overallStatus:  "APPROVED",
  //   totalChecks:    19,
  //   passed:         19,
  //   failed:         0,
  //   skipped:        0,
  //   failedParams:   [],
  //   skippedParams:  [],
  //   results: [
  //     { paramNo: 1,  paramName: "Profession", status: "PASS", value: "SALARIED",
  //       message: "SALARIED is an allowed profession for QuickLoan Finance." },
  //     { paramNo: 7,  paramName: "Age", status: "PASS", value: 32,
  //       message: "Age 32 is within 21–55 for QuickLoan Finance." },
  //     { paramNo: 17, paramName: "CRIF Score", status: "PASS", value: 720,
  //       message: "CRIF score 720 exceeds 500 minimum for QuickLoan Finance." },
  //     ... (all 19 as PASS)
  //   ]
  // }
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3 — REJECTED: multiple checks fail for BRAND_002 (PremiumEdge)
// ─────────────────────────────────────────────────────────────────────────────

async function example_rejected() {
  const service = await bootstrapService();

  const dto: LoanApplicationDto = {
    profession:          'SALARIED',
    salaryThreshold:     'ABOVE',
    phoneNumber:         '9876543210',
    panCard:             'ABCPE1234F',
    panAadharLinked:     'YES',
    aadharLast4Received: 'YES',
    age:                 22,           // ❌ FAIL — BRAND_002 requires 25–50
    pinCodeStatus:       'COMPLIANT',
    ifscStatus:          'VALID',
    nameMatchPanBank:    80,           // ❌ FAIL — BRAND_002 requires >85%
    bankStatementStatus: 'ORIGINAL',
    videoStatus:         'NORMAL',
    aadharPanDigitMatch: 'MATCH',
    genderMatch:         'MATCH',
    nameMatchPanAadhar:  82,           // ❌ FAIL — BRAND_002 requires >85%
    nbfcStatus:          'DIFFERENT',
    crifScore:           650,          // ❌ FAIL — BRAND_002 requires >700
    crifReportStatus:    'NON_DELINQUENT',
    brandLoanStatus:     'NON_DEFAULT',
  };

  const result = service.validate('BRAND_002', dto);

  console.log(result.overallStatus);  // "REJECTED"
  console.log(result.failed);         // 4
  console.log(result.failedParams);
  // [
  //   "Age",
  //   "Name Match: PAN vs Bank Account",
  //   "Name Match: PAN vs Aadhar",
  //   "CRIF Score"
  // ]

  // Drill into individual failed results:
  result.results
    .filter(r => r.status === 'FAIL')
    .forEach(r => console.log(`[P${r.paramNo}] ${r.paramName}: ${r.message}`));
  // [P7]  Age: Age 22 is outside 25–50 required by PremiumEdge Credit.
  // [P10] Name Match: PAN vs Bank Account: 80% is below the 85% threshold required by PremiumEdge Credit.
  // [P15] Name Match: PAN vs Aadhar: 82% is below the 85% threshold required by PremiumEdge Credit.
  // [P17] CRIF Score: CRIF score 650 is below the 700 minimum required by PremiumEdge Credit.
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 4 — Same applicant validated across multiple brands
//             Shows how brand rules affect the same person differently
// ─────────────────────────────────────────────────────────────────────────────

async function example_multi_brand_comparison() {
  const service = await bootstrapService();

  // Borderline applicant — passes some brands but not others
  const borderlineApplicant: LoanApplicationDto = {
    profession:          'SELF_EMPLOYED',  // ❌ fails strict brands
    salaryThreshold:     'ABOVE',
    phoneNumber:         '9876543210',
    panCard:             'ABCPE1234F',
    panAadharLinked:     'YES',
    aadharLast4Received: 'YES',
    age:                 19,               // ❌ fails strict brands (min 21)
    pinCodeStatus:       'COMPLIANT',
    ifscStatus:          'VALID',
    nameMatchPanBank:    70,               // ❌ fails >75% brands
    bankStatementStatus: 'ORIGINAL',
    videoStatus:         'NORMAL',
    aadharPanDigitMatch: 'MATCH',
    genderMatch:         'MATCH',
    nameMatchPanAadhar:  68,               // ❌ fails >75% brands
    nbfcStatus:          'DIFFERENT',
    crifScore:           480,              // ❌ fails >500 brands
    crifReportStatus:    'NON_DELINQUENT',
    brandLoanStatus:     'NON_DEFAULT',
  };

  const brands = ['BRAND_001', 'BRAND_002', 'BRAND_003', 'BRAND_004', 'BRAND_005'];

  const comparison = brands.map(brandId => {
    const result = service.validate(brandId, borderlineApplicant);
    return {
      brandId,
      brandName:     result.brandName,
      overallStatus: result.overallStatus,
      passed:        result.passed,
      failed:        result.failed,
      failedParams:  result.failedParams,
    };
  });

  console.table(comparison);
  // ┌────────────┬─────────────────────┬───────────────┬────────┬────────┐
  // │ brandId    │ brandName           │ overallStatus │ passed │ failed │
  // ├────────────┼─────────────────────┼───────────────┼────────┼────────┤
  // │ BRAND_001  │ QuickLoan Finance   │ REJECTED      │ 14     │ 5      │
  // │ BRAND_002  │ PremiumEdge Credit  │ REJECTED      │ 12     │ 7      │
  // │ BRAND_003  │ FlexiMicro Loans    │ APPROVED      │ 17     │ 0      │ ← passes!
  // │ BRAND_004  │ SecureHome Mortgage │ REJECTED      │ 13     │ 6      │
  // │ BRAND_005  │ InstaCash Digital   │ APPROVED      │ 14     │ 0      │ ← passes!
  // └────────────┴─────────────────────┴───────────────┴────────┴────────┘
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 5 — SKIPPED checks (BRAND_003 disables video, NBFC; BRAND_005 disables more)
// ─────────────────────────────────────────────────────────────────────────────

async function example_skipped_checks() {
  const service = await bootstrapService();

  const dto: LoanApplicationDto = {
    profession:          'SELF_EMPLOYED',
    salaryThreshold:     'ABOVE',
    phoneNumber:         '9876543210',
    panCard:             'ABCPE1234F',
    panAadharLinked:     'YES',
    aadharLast4Received: 'YES',
    age:                 28,
    pinCodeStatus:       'COMPLIANT',
    ifscStatus:          'VALID',
    nameMatchPanBank:    80,
    bankStatementStatus: 'ORIGINAL',
    videoStatus:         'INAPPROPRIATE',  // would FAIL — but BRAND_003 has this disabled
    aadharPanDigitMatch: 'MATCH',
    genderMatch:         'MATCH',
    nameMatchPanAadhar:  80,
    nbfcStatus:          'SAME',           // would FAIL — but BRAND_003 has this disabled
    crifScore:           450,
    crifReportStatus:    'NON_DELINQUENT',
    brandLoanStatus:     'NON_DEFAULT',
  };

  const result = service.validate('BRAND_003', dto);  // FlexiMicro

  console.log(result.overallStatus);  // "APPROVED" — video + nbfc are SKIPPED
  console.log(result.skipped);        // 2
  console.log(result.skippedParams);  // ["Video Upload", "NBFC Check"]

  // Inspect the skipped results
  result.results
    .filter(r => r.status === 'SKIPPED')
    .forEach(r => console.log(`[P${r.paramNo}] SKIPPED: ${r.message}`));
  // [P12] SKIPPED: This check is disabled for this brand.
  // [P16] SKIPPED: This check is disabled for this brand.
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 6 — List all configured brands
// ─────────────────────────────────────────────────────────────────────────────

async function example_list_brands() {
  const service = await bootstrapService();

  const brands = service.listBrands();
  console.log(brands);
  // [
  //   { brandId: 'BRAND_001', brandName: 'QuickLoan Finance',   description: '...', isActive: true },
  //   { brandId: 'BRAND_002', brandName: 'PremiumEdge Credit',  description: '...', isActive: true },
  //   { brandId: 'BRAND_003', brandName: 'FlexiMicro Loans',    description: '...', isActive: true },
  //   { brandId: 'BRAND_004', brandName: 'SecureHome Mortgage', description: '...', isActive: true },
  //   { brandId: 'BRAND_005', brandName: 'InstaCash Digital',   description: '...', isActive: true },
  // ]

  // Use it to build a dropdown in your frontend:
  const dropdownOptions = brands
    .filter(b => b.isActive)
    .map(b => ({ value: b.brandId, label: b.brandName }));
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 7 — Error handling: invalid brand ID
// ─────────────────────────────────────────────────────────────────────────────

async function example_invalid_brand() {
  const service = await bootstrapService();

  try {
    service.validate('BRAND_999', {} as LoanApplicationDto);
  } catch (err) {
    console.log(err.status);   // 404
    console.log(err.message);  // 'Brand "BRAND_999" not found in rules config.'
  }

  // NestJS automatically converts NotFoundException → HTTP 404 response:
  // {
  //   "statusCode": 404,
  //   "message": "Brand \"BRAND_999\" not found in rules config.",
  //   "error": "Not Found"
  // }
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 8 — Partial payload: only send fields for the brand's enabled checks
//             Useful for BRAND_005 (InstaCash) which disables bankStatement,
//             video, and NBFC — no need to include those fields
// ─────────────────────────────────────────────────────────────────────────────

async function example_partial_payload_brand005() {
  const service = await bootstrapService();

  // BRAND_005 (InstaCash Digital) has these disabled: bankStatement, video, NBFC
  // So you only need to send the 16 fields for enabled checks
  const dto: LoanApplicationDto = {
    profession:          'SELF_EMPLOYED',
    salaryThreshold:     'ABOVE',
    phoneNumber:         '8765432109',
    panCard:             'XYZPE5678K',
    panAadharLinked:     'YES',
    aadharLast4Received: 'YES',
    age:                 35,
    pinCodeStatus:       'COMPLIANT',
    ifscStatus:          'VALID',
    nameMatchPanBank:    75,           // above BRAND_005's 70% threshold
    // bankStatementStatus: omitted — check is disabled for BRAND_005
    // videoStatus: omitted          — check is disabled for BRAND_005
    aadharPanDigitMatch: 'MATCH',
    genderMatch:         'MATCH',
    nameMatchPanAadhar:  76,
    // nbfcStatus: omitted           — check is disabled for BRAND_005
    crifScore:           460,          // above BRAND_005's 450 threshold
    crifReportStatus:    'NON_DELINQUENT',
    brandLoanStatus:     'NON_DEFAULT',
  };

  const result = service.validate('BRAND_005', dto);

  console.log(result.overallStatus);  // "APPROVED"
  console.log(result.totalChecks);    // 16 (3 disabled = skipped)
  console.log(result.skippedParams);  // ["Bank Statement Upload", "Video Upload", "NBFC Check"]
}


// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 9 — Usage inside a real NestJS controller
// ─────────────────────────────────────────────────────────────────────────────

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

@Controller('loan-validation')
export class LoanValidationController {
  constructor(private readonly brandRulesService: BrandRulesValidationService) {}

  // GET /loan-validation/brands
  @Get('brands')
  listBrands() {
    return this.brandRulesService.listBrands();
  }

  // POST /loan-validation/validate/BRAND_001
  @Post('validate/:brandId')
  @HttpCode(HttpStatus.OK)
  validateByBrand(
    @Param('brandId') brandId: string,
    @Body() dto: LoanApplicationDto,
  ) {
    return this.brandRulesService.validate(brandId, dto);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap helper — used only in standalone/test contexts
// In a real NestJS app the service is injected automatically via DI
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrapService(): Promise<BrandRulesValidationService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [BrandRulesValidationService],
  }).compile();

  const service = module.get<BrandRulesValidationService>(BrandRulesValidationService);
  await module.init(); // triggers onModuleInit → loads brand-rules.json
  return service;
}
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { LoanApplicationDto } from './brand.application.dto';
import { ValidationSummary, ParameterResult } from './validation.interface';
import { PrismaService } from '../../prisma/prisma.service';

// ── Types matching brand-rules.json ──────────────────────────────────────────

interface RuleBase {
  paramNo: number;
  paramName: string;
  enabled: boolean;
  description: string;
  rejectionReasonId: string | null;
  successReasonId: string | null;
}

interface ProfessionRule extends RuleBase {
  allowedValues: string[];
  failValues: string[];
}

interface ThresholdRule extends RuleBase {
  threshold: number;
  currency: string;
  operator: 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';
}

interface PhoneRule extends RuleBase {
  exactLength: number;
  pattern: string;
}

interface PanRule extends RuleBase {
  fourthCharMustBe: string;
  pattern: string;
  fraudDbCheck: boolean;
}

interface MustBeRule extends RuleBase {
  mustBe: string;
}

interface AgeRule extends RuleBase {
  min: number;
  max: number;
  unit: string;
}

interface MatchPercentRule extends RuleBase {
  minMatchPercent: number;
  operator: 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';
}

interface CrifScoreRule extends RuleBase {
  minScore: number;
  operator: 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';
}

type AnyRule =
  | ProfessionRule | ThresholdRule | PhoneRule | PanRule
  | MustBeRule | AgeRule | MatchPercentRule | CrifScoreRule;

interface BrandRules {
  brandId: string;
  brandName: string;
  description: string;
  isActive: boolean;
  rules: Record<string, AnyRule>;
}

interface BrandRulesConfig {
  brands: BrandRules[];
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class BrandRulesValidationService implements OnModuleInit {

  private readonly brandMap = new Map<string, BrandRules>();

  constructor(private readonly prisma: PrismaService) {}

  // Load JSON on startup
  onModuleInit() {
    const filePath = join(process.cwd(), 'src', 'features', 'brandRuleValidation', 'brand-rules.json');
    const raw = readFileSync(filePath, 'utf-8');
    const config: BrandRulesConfig = JSON.parse(raw);
    for (const brand of config.brands) {
      this.brandMap.set(brand.brandId, brand);
    }
    console.log(`[BrandRules] Loaded ${this.brandMap.size} brand configs.`);
  }

  // ── Public: validate against a specific brand ────────────────────────────

  async validate(brandId: string, dto: LoanApplicationDto): Promise<ValidationSummary> {
    const brand = this.brandMap.get(brandId);
    if (!brand) {
      throw new NotFoundException(`Brand "${brandId}" not found in rules config.`);
    }
    if (!brand.isActive) {
      throw new BadRequestException(`Brand "${brandId}" is currently inactive.`);
    }

    const results: ParameterResult[] = [
      this.evalProfession(brand, dto),
      this.evalSalary(brand, dto),
      await this.evalPhone(brand, dto),
      await this.evalPan(brand, dto),
      this.evalMustBe('5_panAadharLink', 5, brand, dto.panAadharLinked),
      this.evalMustBe('6_aadharLast4', 6, brand, dto.aadharLast4Received),
      this.evalAge(brand, dto),
      await this.evalPinCode(brand, dto),
      this.evalMustBe('9_ifsc', 9, brand, dto.ifscStatus),
      this.evalMatchPercent('10_nameMatchPanBank', 10, brand, dto.nameMatchPanBank),
      this.evalMustBe('11_bankStatement', 11, brand, dto.bankStatementStatus),
      this.evalMustBe('12_videoUpload', 12, brand, dto.videoStatus),
      this.evalMustBe('13_aadharPanDigitMatch', 13, brand, dto.aadharPanDigitMatch),
      this.evalMustBe('14_genderMatch', 14, brand, dto.genderMatch),
      this.evalMatchPercent('15_nameMatchPanAadhar', 15, brand, dto.nameMatchPanAadhar),
      this.evalMustBe('16_nbfc', 16, brand, dto.nbfcStatus),
      this.evalCrifScore(brand, dto),
      this.evalMustBe('18_crifReport', 18, brand, dto.crifReportStatus),
      this.evalMustBe('19_brandLoan', 19, brand, dto.brandLoanStatus),
    ];

    const passed  = results.filter((r) => r.status === 'PASS').length;
    const failed  = results.filter((r) => r.status === 'FAIL').length;
    const skipped = results.filter((r) => r.status === 'SKIPPED').length;

    return {
      applicationId:  uuidv4(),
      timestamp:      new Date().toISOString(),
      brandId:        brand.brandId,
      brandName:      brand.brandName,
      overallStatus:  failed === 0 ? 'APPROVED' : 'REJECTED',
      totalChecks:    passed + failed,
      passed,
      failed,
      skipped,
      results,
      failedParams:  results.filter((r) => r.status === 'FAIL').map((r) => r.paramName),
      skippedParams: results.filter((r) => r.status === 'SKIPPED').map((r) => r.paramName),
    };
  }

  // ── Public: list all available brands ────────────────────────────────────

  listBrands() {
    return [...this.brandMap.values()].map(({ brandId, brandName, description, isActive }) => ({
      brandId, brandName, description, isActive,
    }));
  }

  // ── Evaluators ────────────────────────────────────────────────────────────

  private evalProfession(brand: BrandRules, dto: LoanApplicationDto): ParameterResult {
    const rule = brand.rules['1_profession'] as ProfessionRule;
    if (!rule.enabled) return this.skipped(rule);
    if (!dto.profession) return this.missingField(rule, 'profession');
    const ok = rule.allowedValues.includes(dto.profession);
    return ok
      ? this.pass(rule, dto.profession, `${dto.profession} is an allowed profession for ${brand.brandName}.`)
      : this.fail(rule, dto.profession, `${dto.profession} is not allowed. Allowed: ${rule.allowedValues.join(', ')}.`);
  }

  private evalSalary(brand: BrandRules, dto: LoanApplicationDto): ParameterResult {
    const rule = brand.rules['2_salaryThreshold'] as ThresholdRule;
    if (!rule.enabled) return this.skipped(rule);
    // For salary, the DTO carries ABOVE/BELOW relative to the brand's threshold
    if (!dto.salaryThreshold) return this.missingField(rule, 'salaryThreshold');
    const ok = dto.salaryThreshold === 'ABOVE';
    return ok
      ? this.pass(rule, dto.salaryThreshold, `Salary meets the ₹${rule.threshold.toLocaleString('en-IN')} threshold for ${brand.brandName}.`)
      : this.fail(rule, dto.salaryThreshold, `Salary is below the ₹${rule.threshold.toLocaleString('en-IN')} threshold required by ${brand.brandName}.`);
  }

  private async evalPhone(brand: BrandRules, dto: LoanApplicationDto): Promise<ParameterResult> {
    const rule = brand.rules['3_phoneNumber'] as PhoneRule;
    if (!rule.enabled) return this.skipped(rule);
    if (!dto.phoneNumber) return this.missingField(rule, 'phoneNumber');
    const regex = new RegExp(rule.pattern);
    if (!regex.test(dto.phoneNumber))
      return this.fail(rule, dto.phoneNumber, `Phone number must match pattern ${rule.pattern}.`);
    if (await this.isBrandBlocklistedMobile(brand.brandId, dto.phoneNumber))
      return this.fail(rule, dto.phoneNumber, `Phone number is blocklisted for ${brand.brandName}.`);
    return this.pass(rule, dto.phoneNumber, 'Phone number is valid.');
  }

private async evalPan(
  brand: BrandRules,
  dto: LoanApplicationDto
): Promise<ParameterResult> {

  console.log(`[PAN] Start evaluation | brandId=${brand.brandId}`);

  const rule = brand.rules['4_panCard'] as PanRule;

  if (!rule.enabled) {
    console.warn(`[PAN] Rule disabled | brandId=${brand.brandId}`);
    return this.skipped(rule);
  }

  if (!dto.panCard) {
    console.warn(`[PAN] Missing PAN in request | brandId=${brand.brandId}`);
    return this.missingField(rule, 'panCard');
  }

  const pan = dto.panCard.toUpperCase();
  console.log(`[PAN] Normalized PAN: ${pan}`);

  const regex = new RegExp(rule.pattern);

  if (!regex.test(pan)) {
    console.warn(`[PAN] Invalid format | PAN=${pan} | Pattern=${rule.pattern}`);
    return this.fail(rule, pan, `PAN format invalid. Must match: ${rule.pattern}`);
  }

  console.log(`[PAN] Format valid | PAN=${pan}`);

  if (rule.fraudDbCheck) {
    console.log(`[PAN] Fraud DB check enabled | PAN=${pan}`);

    const fraudFound = await this.isBrandBlocklistedPan(brand.brandId, pan);
    console.log(`[PAN] Fraud DB result | PAN=${pan} | Result=${fraudFound}`);

    if (fraudFound) {
      console.error(`[PAN] Fraudulent PAN detected | PAN=${pan}`);
      return this.fail(rule, pan, 'PAN found in Fraud Database.');
    }
  }

  console.log(`[PAN] Validation success | PAN=${pan}`);
  return this.pass(rule, pan, 'PAN is valid and cleared fraud check.');
}
  private evalMustBe(
    ruleKey: string,
    paramNo: number,
    brand: BrandRules,
    value: string | undefined,
  ): ParameterResult {
    const rule = brand.rules[ruleKey] as MustBeRule;
    if (!rule.enabled) return this.skipped(rule);
    if (value === undefined || value === null) return this.missingField(rule, ruleKey);
    const ok = value === rule.mustBe;
    return ok
      ? this.pass(rule, value, `${rule.paramName} passed — value is "${value}".`)
      : this.fail(rule, value, `${rule.paramName} failed — expected "${rule.mustBe}", got "${value}".`);
  }

  private evalAge(brand: BrandRules, dto: LoanApplicationDto): ParameterResult {
    const rule = brand.rules['7_age'] as AgeRule;
    if (!rule.enabled) return this.skipped(rule);
    if (dto.age === undefined) return this.missingField(rule, 'age');
    const ok = dto.age >= rule.min && dto.age <= rule.max;
    return ok
      ? this.pass(rule, dto.age, `Age ${dto.age} is within ${rule.min}–${rule.max} for ${brand.brandName}.`)
      : this.fail(rule, dto.age, `Age ${dto.age} is outside ${rule.min}–${rule.max} required by ${brand.brandName}.`);
  }

  private async evalPinCode(brand: BrandRules, dto: LoanApplicationDto): Promise<ParameterResult> {
    const rule = brand.rules['8_pinCode'] as MustBeRule;
    if (!rule.enabled) return this.skipped(rule);
    if (!dto.pinCode) return this.missingField(rule, 'pinCode');
    
    // Check if pincode is blocked in master_pincodes table
    const isPincodeBlocked = await this.isPincodeBlocked(dto.pinCode);
    if (isPincodeBlocked) {
      return this.fail(rule, dto.pinCode, `Pin code ${dto.pinCode} is blocked.`);
    }
    
    // Also check the pinCodeStatus if it exists
    if (dto.pinCodeStatus !== undefined && dto.pinCodeStatus !== null) {
      const ok = dto.pinCodeStatus === rule.mustBe;
      return ok
        ? this.pass(rule, dto.pinCodeStatus, `${rule.paramName} passed — value is "${dto.pinCodeStatus}".`)
        : this.fail(rule, dto.pinCodeStatus, `${rule.paramName} failed — expected "${rule.mustBe}", got "${dto.pinCodeStatus}".`);
    }
    
    return this.pass(rule, dto.pinCode, `Pin code ${dto.pinCode} is valid and not blocked.`);
  }

  private evalMatchPercent(
    ruleKey: string,
    paramNo: number,
    brand: BrandRules,
    value: number | undefined,
  ): ParameterResult {
    const rule = brand.rules[ruleKey] as MatchPercentRule;
    if (!rule.enabled) return this.skipped(rule);
    if (value === undefined) return this.missingField(rule, ruleKey);
    const ok = rule.operator === 'GREATER_THAN'
      ? value > rule.minMatchPercent
      : value >= rule.minMatchPercent;
    return ok
      ? this.pass(rule, `${value}%`, `${value}% exceeds ${rule.minMatchPercent}% threshold for ${brand.brandName}.`)
      : this.fail(rule, `${value}%`, `${value}% is below the ${rule.minMatchPercent}% threshold required by ${brand.brandName}.`);
  }

  private evalCrifScore(brand: BrandRules, dto: LoanApplicationDto): ParameterResult {
    const rule = brand.rules['17_crifScore'] as CrifScoreRule;
    if (!rule.enabled) return this.skipped(rule);
    if (dto.crifScore === undefined) return this.missingField(rule, 'crifScore');
    const ok = rule.operator === 'GREATER_THAN'
      ? dto.crifScore > rule.minScore
      : dto.crifScore >= rule.minScore;
    return ok
      ? this.pass(rule, dto.crifScore, `CRIF score ${dto.crifScore} exceeds ${rule.minScore} minimum for ${brand.brandName}.`)
      : this.fail(rule, dto.crifScore, `CRIF score ${dto.crifScore} is below the ${rule.minScore} minimum required by ${brand.brandName}.`);
  }

  // ── Result builders ───────────────────────────────────────────────────────

  private pass(rule: RuleBase, value: unknown, message: string): ParameterResult {
    return { paramNo: rule.paramNo, paramName: rule.paramName, status: 'PASS', value, message, rejectionReasonId: null, successReasonId: null };
  }

  private fail(rule: RuleBase, value: unknown, message: string): ParameterResult {
    return { 
      paramNo: rule.paramNo, 
      paramName: rule.paramName, 
      status: 'FAIL', 
      value, 
      message,
      rejectionReasonId: rule.rejectionReasonId,
      successReasonId: rule.successReasonId,
    };
  }

  private skipped(rule: RuleBase): ParameterResult {
    return { paramNo: rule.paramNo, paramName: rule.paramName, status: 'SKIPPED', value: null, message: 'This check is disabled for this brand.', rejectionReasonId: null, successReasonId    : null };
  }

  private missingField(rule: RuleBase, field: string): ParameterResult {
    return this.fail(rule, null, `Field "${field}" is required for this check but was not provided.`);
  }

  // ── Fraud DB stub ─────────────────────────────────────────────────────────

  private async isBrandBlocklistedPan(brandId: string, pan: string): Promise<boolean> {

    const blocklisted = await this.prisma.brandBlocklistedPan.findUnique({
      where: {
        pancard_brandId: {
          pancard: pan,
          brandId: brandId,
        },
      },
    });
    console.log(`Blocklist check for PAN ${pan} and brand ${brandId}:`, { blocklisted });
    return !!blocklisted;
  }

  private async isBrandBlocklistedMobile(brandId: string, phoneNumber: string): Promise<boolean> {
    const blocklisted = await this.prisma.brandBlocklistedMobile.findUnique({
      where: {
        mobile_brandId: {
          mobile: phoneNumber,
          brandId: brandId,
        },
      },
    });
    return !!blocklisted;
  }

  private async isPincodeBlocked(pincode: string): Promise<boolean> {
    const pincodeRecord = await this.prisma.master_pincodes.findUnique({
      where: {
        pincode: pincode,
      },
    });
    return pincodeRecord?.is_blocked ?? false;
  }
}
# Reloan Automation Service

## Overview

The `ReloanAutomationService` is a NestJS service that evaluates the eligibility of customers to apply for a reloan (subsequent loan) based on their previous loan performance and business rules. It automates the approval workflow routing decisions (automated approval, manual review, or rejection).

## Purpose

This service provides:

- **Automated Hard Stop Detection** - Immediately rejects disqualifying applications
- **Workflow Routing** - Routes applications to appropriate approval channels
- **Decision Transparency** - Provides detailed reasons and flags for every decision
- **Audit Trail** - Enables compliance and monitoring capabilities

## Key Concepts

### Hard Stops (Disqualifying Factors)

Hard stops immediately reject an application with no further review:

#### 1. Incomplete Previous Loan

- **Condition**: `previousLoanStatus !== "COMPLETED"`
- **Result**: ❌ **REJECTED**
- **Flag**: `HARD_STOP`
- **Reason**: Customer must have fully completed their previous loan before qualifying for a reloan

#### 2. Non-Normal Closure Status

- **Condition**: `previousClosureStatus !== "NORMAL"`
- **Allowed**: Only "NORMAL" closure is acceptable
- **Rejected**: "WRITE_OFF", "SETTLEMENT", or other non-normal closures
- **Result**: ❌ **REJECTED**
- **Flag**: `HARD_STOP`
- **Reason**: Loans closed via settlement or written off indicate credit quality concerns and payment behavior issues

#### 3. High Days Past Due (DPD)

- **Condition**: `daysPastDue > 30` days
- **Calculation**: `previousClosureDate - previousDueDate`
- **Result**: ❌ **REJECTED**
- **Flag**: `HIGH_DPD`
- **Reason**: Loans significantly overdue indicate serious payment issues and credit risk

#### 4. Missing Required Data

- **Condition**: Any required field is null, undefined, or invalid
- **Result**: ❌ **REJECTED**
- **Flag**: `HARD_STOP`
- **Reason**: Cannot proceed without complete loan information

---

## Approval Workflow Routing

After passing all hard stops, reloans are routed based on time bucket and amount comparison:

### LESS_90_DAYS Bucket (< 90 days since previous disbursement)

#### Scenario 1: AA Available + Same/Less Amount

```
Condition: bucket = LESS_90_DAYS AND currentLoanAmount ≤ previousLoanAmount AND aa_availability = true
Result: ✅ APPROVED (Automated)
Step: APPROVED
Flag: AUTOMATED_FLOW
Manual Review: NO
```

- **Reason**: Low risk profile - recent loan completion, consistent amount, AA verified
- **Approval**: Instant auto-approval without manual intervention

#### Scenario 2: AA Available + Amount Increase

```
Condition: bucket = LESS_90_DAYS AND currentLoanAmount > previousLoanAmount AND aa_availability = true
Result: ⏳ PENDING (Manual Review)
Step: CREDIT_EXECUTIVE_APPROVED
Flag: AMOUNT_INCREASE
Manual Review: YES (required)
```

- **Reason**: Amount increase requires credit executive verification
- **Approval**: Routed to credit executive for decision
- **Note**: Even though within 90 days, higher amount needs additional scrutiny

#### Scenario 3: AA Not Available (Any amount)

```
Condition: bucket = LESS_90_DAYS AND aa_availability = false
Result: ⏳ PENDING (Manual Review)
Step: PENDING
Flag: MANUAL_REVIEW_REQUIRED
Manual Review: YES (required)
```

- **Reason**: Missing Aadhaar authentication or address verification
- **Approval**: Routed to manual review queue
- **Impact**: Blocks automated processing regardless of amount

### MORE_90_DAYS Bucket (≥ 90 days since previous disbursement)

```
Condition: bucket = MORE_90_DAYS (any amount, any AA status)
Result: ⏳ PENDING (Manual Review)
Step: PENDING
Flag: MANUAL_REVIEW_REQUIRED
Manual Review: YES (required)
```

- **Reason**: Longer gaps between loans require verification of customer circumstances
- **Approval**: Routed to credit executive for decision
- **Why**: Need to reassess customer profile, income stability, and current financial situation after extended period

---

## Data Models

### ReloanEligibilityContext (Input)

```typescript
{
  userId: string; // Customer ID (e.g., "USR12345")
  brandId: string; // Brand/Lender ID (e.g., "BRAND001")
  previousLoanId: string; // Previous loan reference (e.g., "LOAN456")

  // Dates
  previousDisbursementDate: Date; // When previous loan was disbursed
  previousDueDate: Date; // When previous loan was due
  previousClosureDate: Date; // When previous loan was closed/repaid

  // Loan Status
  previousClosureStatus: string; // "NORMAL" | "WRITE_OFF" | "SETTLEMENT"
  previousLoanStatus: string; // "COMPLETED" | other statuses

  // Amounts
  previousLoanAmount: number; // Amount of previous loan (e.g., 50000)
  currentLoanAmount: number; // Amount of new reloan application (e.g., 60000)

  // Verification
  aa_availability: boolean; // Is Aadhaar authentication available?
}
```

### ReloanEligibilityResult (Output)

```typescript
{
  eligible: boolean;                 // false = hard stop triggered, true = eligible
  reasons: string[];                 // Detailed reasons for decision (for audit trail)
  bucket: string;                    // "LESS_90_DAYS" | "MORE_90_DAYS"
  flags: string[];                   // Status flags indicating decision factors
  requiresManualReview: boolean;     // Whether credit review needed
  step: string;                      // "APPROVED" | "PENDING" | "CREDIT_EXECUTIVE_APPROVED"
}
```

---

## Decision Flow Diagram

```
START: ReloanEligibilityContext
  ↓
┌─────────────────────────────────────────────┐
│ 1. VALIDATION CHECK                         │
│    All required fields present?             │
└────────────────┬────────────────────────────┘
                 │
         NO ────→ ❌ REJECTED (HARD_STOP)
                 │
                 YES
                 │
┌────────────────┴────────────────────────────┐
│ 2. LOAN STATUS CHECK                        │
│    previousLoanStatus = "COMPLETED"?        │
└────────────────┬────────────────────────────┘
                 │
         NO ────→ ❌ REJECTED (HARD_STOP)
                 │
                 YES
                 │
┌────────────────┴────────────────────────────┐
│ 3. CLOSURE STATUS CHECK                     │
│    previousClosureStatus = "NORMAL"?        │
└────────────────┬────────────────────────────┘
                 │
         NO ────→ ❌ REJECTED (HARD_STOP)
                 │
                 YES
                 │
┌────────────────┴────────────────────────────┐
│ 4. DPD (Days Past Due) CHECK                │
│    (closeDate - dueDate) ≤ 30 days?        │
└────────────────┬────────────────────────────┘
                 │
        NO (>30)→ ❌ REJECTED (HIGH_DPD)
                 │
                 YES
                 │
┌────────────────┴────────────────────────────┐
│ 5. TIME BUCKET CALCULATION                  │
│    Days from disbursement to today          │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
    < 90 DAYS          ≥ 90 DAYS
    (LESS_90_DAYS)     (MORE_90_DAYS)
        │                   │
        │            ⏳ PENDING
        │            MANUAL_REVIEW
        │                   │
┌───────┴───────┐           │
│ 6a. CHECK AA  │           │
└───────┬───────┘           │
        │                   │
     NO ─→ ⏳ PENDING        │
           MANUAL_REVIEW    │
        │                   │
     YES                    │
        │                   │
┌───────┴───────┐           │
│ 6b. CHECK     │           │
│ AMOUNT        │           │
└───────┬───────┘           │
        │                   │
   ┌────┴────┐              │
   │          │             │
SAME/LESS   MORE           │
   │       THAN            │
   │    PREVIOUS           │
   │          │            │
   │  ⏳ PENDING       │
   │  CREDIT_EXEC       │
   │    APPROVED        │
   │          │         │
   │          │         │
   ✅          │         │
   APPROVED   │         │
              │         │
              └────┬────┘
                   │
              RETURN RESULT
```

---

## Usage Examples

### Example 1: Auto-Approved Application

```typescript
const context: ReloanEligibilityContext = {
  userId: "USR123",
  brandId: "BRAND001",
  previousLoanId: "LOAN456",
  previousDisbursementDate: new Date("2025-11-15"),  // 3 months ago
  previousDueDate: new Date("2025-12-15"),
  previousClosureDate: new Date("2025-12-18"),
  previousClosureStatus: "NORMAL",
  previousLoanStatus: "COMPLETED",
  previousLoanAmount: 50000,
  currentLoanAmount: 50000,  // Same amount
  aa_availability: true,
};

const result = await reloanService.evaluateReloanEligibility(context);

// RESPONSE:
{
  eligible: true,
  reasons: [
    "Current loan amount (50000) is less than or equal to previous amount (50000) - eligible for automated flow"
  ],
  bucket: "LESS_90_DAYS",
  flags: ["AUTOMATED_FLOW"],
  requiresManualReview: false,
  step: "APPROVED"
}
```

### Example 2: Manual Review Required - Amount Increase

```typescript
const context: ReloanEligibilityContext = {
  userId: "USR123",
  brandId: "BRAND001",
  previousLoanId: "LOAN456",
  previousDisbursementDate: new Date("2025-11-15"),  // 3 months ago
  previousDueDate: new Date("2025-12-15"),
  previousClosureDate: new Date("2025-12-18"),
  previousClosureStatus: "NORMAL",
  previousLoanStatus: "COMPLETED",
  previousLoanAmount: 50000,
  currentLoanAmount: 75000,  // 50% increase
  aa_availability: true,
};

const result = await reloanService.evaluateReloanEligibility(context);

// RESPONSE:
{
  eligible: true,
  reasons: [
    "Current loan amount (75000) exceeds previous amount (50000)"
  ],
  bucket: "LESS_90_DAYS",
  flags: ["AMOUNT_INCREASE"],
  requiresManualReview: true,
  step: "CREDIT_EXECUTIVE_APPROVED"
}
```

### Example 3: Manual Review Required - Beyond 90 Days

```typescript
const context: ReloanEligibilityContext = {
  userId: "USR123",
  brandId: "BRAND001",
  previousLoanId: "LOAN456",
  previousDisbursementDate: new Date("2025-08-15"),  // 6 months ago
  previousDueDate: new Date("2025-09-15"),
  previousClosureDate: new Date("2025-09-18"),
  previousClosureStatus: "NORMAL",
  previousLoanStatus: "COMPLETED",
  previousLoanAmount: 50000,
  currentLoanAmount: 50000,  // Same amount
  aa_availability: true,
};

const result = await reloanService.evaluateReloanEligibility(context);

// RESPONSE:
{
  eligible: true,
  reasons: [
    "Reloan after 90+ days since previous disbursement - requires manual review"
  ],
  bucket: "MORE_90_DAYS",
  flags: ["MANUAL_REVIEW_REQUIRED"],
  requiresManualReview: true,
  step: "PENDING"
}
```

### Example 4: Rejection - High DPD

```typescript
const context: ReloanEligibilityContext = {
  userId: "USR123",
  brandId: "BRAND001",
  previousLoanId: "LOAN456",
  previousDisbursementDate: new Date("2025-11-15"),
  previousDueDate: new Date("2025-12-15"),
  previousClosureDate: new Date("2026-01-25"),  // 41 days after due date
  previousClosureStatus: "NORMAL",
  previousLoanStatus: "COMPLETED",
  previousLoanAmount: 50000,
  currentLoanAmount: 50000,
  aa_availability: true,
};

const result = await reloanService.evaluateReloanEligibility(context);

// RESPONSE:
{
  eligible: false,
  reasons: [
    "Days past due (41) exceeds 30 days"
  ],
  bucket: "LESS_90_DAYS",
  flags: ["HIGH_DPD"],
  requiresManualReview: false,
  step: "REJECTED"
}
```

### Example 5: Rejection - Non-Normal Closure

```typescript
const context: ReloanEligibilityContext = {
  userId: "USR123",
  brandId: "BRAND001",
  previousLoanId: "LOAN456",
  previousDisbursementDate: new Date("2025-11-15"),
  previousDueDate: new Date("2025-12-15"),
  previousClosureDate: new Date("2025-12-18"),
  previousClosureStatus: "WRITE_OFF",  // Non-normal closure
  previousLoanStatus: "COMPLETED",
  previousLoanAmount: 50000,
  currentLoanAmount: 50000,
  aa_availability: true,
};

const result = await reloanService.evaluateReloanEligibility(context);

// RESPONSE:
{
  eligible: false,
  reasons: [
    "Previous loan closed with status: WRITE_OFF"
  ],
  bucket: "LESS_90_DAYS",
  flags: ["HARD_STOP"],
  requiresManualReview: false,
  step: "REJECTED"
}
```

---

## Approval Steps Reference

| Step                        | Status     | Meaning                                               | Action Required                     |
| --------------------------- | ---------- | ----------------------------------------------------- | ----------------------------------- |
| `APPROVED`                  | ✅ Final   | Auto-approved for disbursement                        | Proceed to disbursement             |
| `PENDING`                   | ⏳ Waiting | Requires credit executive review                      | Send to manual review queue         |
| `CREDIT_EXECUTIVE_APPROVED` | ⏳ Waiting | Requires credit executive decision on amount increase | Send to credit executive            |
| `REJECTED`                  | ❌ Final   | Application rejected due to hard stop                 | Notify customer of rejection reason |

---

## Decision Matrix

| Time Bucket | AA Available | Amount | Decision    | Step                      | Manual Review |
| ----------- | ------------ | ------ | ----------- | ------------------------- | ------------- |
| LESS_90     | Yes          | ≤ Prev | ✅ APPROVED | APPROVED                  | NO            |
| LESS_90     | Yes          | > Prev | ⏳ PENDING  | CREDIT_EXECUTIVE_APPROVED | YES           |
| LESS_90     | No           | Any    | ⏳ PENDING  | PENDING                   | YES           |
| MORE_90     | Any          | Any    | ⏳ PENDING  | PENDING                   | YES           |
| Hard Stop   | —            | —      | ❌ REJECTED | REJECTED                  | NO            |

---

## Business Rules Summary

### Hard Stops (Auto-Rejection)

- ✋ Previous loan not in "COMPLETED" status
- ✋ Previous closure not "NORMAL" (WRITE_OFF, SETTLEMENT rejected)
- ✋ Days Past Due > 30 days
- ✋ Missing required input data

### Approved (Automated Flow)

- ✅ Less than 90 days since disbursement
- ✅ AA verification available
- ✅ Current amount ≤ previous amount

### Manual Review Required

- ⏳ More than 90 days since disbursement (any amount)
- ⏳ AA verification not available
- ⏳ Current amount > previous amount (even if < 90 days)

---

## Implementation Notes

- **DPD Calculation**: Uses actual closure date vs due date (not today's date)
- **Time Bucket**: Based on days elapsed from previous disbursement to today
- **Eligible Flag**:
  - `false` = Hard stop triggered (application rejected)
  - `true` = Passed all hard stops (eligible, but may require manual approval)
- **Manual Review Flag**: Indicates need for credit executive approval
- **Default Step**: `PENDING` for all non-approved scenarios

---

## Error Handling

- All hard stops return immediately with complete result
- Missing data treated as hard stop failure
- Invalid dates cause validation failure
- No exceptions thrown - all scenarios handled with result flags

---

## Integration Points

### Upstream (Input)

- Loan service provides previous loan details
- User service verifies AA availability
- Brand service validates brand context

### Downstream (Output)

- Route to auto-disbursement if `step = APPROVED`
- Route to manual review queue if `step = PENDING`
- Route to credit executive if `step = CREDIT_EXECUTIVE_APPROVED`
- Send rejection notification if `eligible = false`

# Reloan Automation System - Architecture & Implementation Guide

## 📋 Overview

This document outlines the architecture and implementation strategy for an automated reloan system based on the **Reloan Automation v2** workflow. The system uses a rule-based engine with workflow orchestration to automate loan approvals while maintaining audit compliance.

---

## 🎯 Key Insights from Workflow

The automation depends on **four decision layers**:

### A. Eligibility Filters (Hard Stops ❌)

User is **NOT eligible** if:

- Settled / Write-off
- DPD > 30
- Defaulted
- Amount Paid < Principal + Interest
- Collection team says "No Reloan"

> **Note:** These are blocking rules that immediately disqualify applicants.

### B. Positive Signals (Soft Eligibility ✅)

Factors that increase eligibility confidence:

- Pre-payment
- Paid on due date
- Partial penalty paid < 15 days
- Full penalty paid < 30 days

### C. Time Since Last Loan (Routing Logic)

Decision point: **< 90 days** vs **> 90 days**

This determines:
- Documents required
- Approval authority
- Automation vs manual processing

### D. Amount & Document Logic

Considerations:
- Same / Less / More than previous sanction
- Account Aggregation available?
- Bank statement uploaded?
- Promo available?

---

## 🏗️ High-Level Architecture

### Core Concept

Treat Reloan as a **Workflow Instance**, not just a loan record.

```
User → Reloan Evaluation
         ↓
    Rule Engine
         ↓
  Workflow State Machine
         ↓
  Tasks (Docs, Approval, E-sign)
```

---

## 🔧 Recommended Components (NestJS)

### 1. ReloanWorkflow Entity (Postgres)

Tracks the current state of each reloan case.

```sql
reloan_workflows
----------------
id
user_id
previous_loan_id
current_state
decision_path
eligibility_score
is_automated
assigned_to_role
created_at
updated_at
```

**Example States:**
- `ELIGIBILITY_CHECK`
- `AUTO_APPROVED`
- `DOC_REQUIRED`
- `SANCTION_MANAGER_REVIEW`
- `CREDIT_EXEC_REVIEW`
- `ESIGN_PENDING`
- `DISBURSEMENT`
- `REJECTED`

### 2. Rule Engine (Pure Business Logic Layer)

**Do NOT put rules inside controllers.**

```typescript
@Injectable()
export class ReloanRuleEngine {
  evaluateEligibility(context: ReloanContext): RuleResult {
    // hard stops
    // soft scoring
    // return structured decision
  }
}
```

**Example Return Structure:**

```json
{
  "eligible": true,
  "reasons": [],
  "score": 82,
  "bucket": "<90_DAYS",
  "flags": ["AA_AVAILABLE", "PROMO_AVAILABLE"]
}
```

### 3. Workflow Orchestrator (State Machine)

The heart of automation.

```typescript
@Injectable()
export class ReloanWorkflowService {
  async transition(workflowId, event) {
    switch (currentState) {
      case 'ELIGIBILITY_CHECK':
        return this.handleEligibility();
      case 'DOC_REQUIRED':
        return this.waitForDocuments();
    }
  }
}
```

> ⚠️ **Important:** Never jump states directly. Always go through `transition()`.

---

## 🔀 Workflow Paths

### Path 1: Fully Automated
**Conditions:** < 90 Days + AA Available + Amount ≤ Previous

```
Eligibility → Promo Check → E-Sign → Loan Ops (Auto Bucket)
```

- No human approval required
- Separate CRM bucket ✅

### Path 2: Sanction Manager Review
**Conditions:** < 90 Days + Amount > Previous + AA Available

```
Eligibility → Sanction Manager → Bank Statement Check → E-Sign
```

### Path 3: Bank Statement Upload Flow
**Conditions:** < 90 Days + No AA + Same or More

```
Eligibility → Doc Upload → Salary Verify → Sanction → E-Sign
```

### Path 4: Always Manual
**Conditions:** > 90 Days

**Mandatory Documents:**
- CRIF
- AA / Bank Statement
- KYC

**Roles Involved:**
- Credit Executive
- Sanction Manager

---

## 🗄️ Database-Driven Rules (CRITICAL)

Instead of hard-coding:

```typescript
// ❌ BAD
if (dpd > 30) reject;
```

Use database tables:

```sql
reloan_rules
------------
rule_code | condition | action | priority

reloan_transitions
------------------
from_state | condition | to_state | role
```

**Benefits:**
- Business can change logic without code deployments
- Zero redeploys required
- Brand-specific rules (easily configurable)

---

## ⚡ Automation Triggers

Use multiple triggers, not just cron:

1. **Loan Closed Event**
2. **Payment Event**
3. **Daily Scheduler** (for missed cases)
4. **Manual Re-evaluation**

**Implementation:**
- Use BullMQ / SQS (AWS compatible)
- Ensure idempotent workflow creation

---

## 📊 Audit & Explainability (Critical for Loans)

Store **WHY** decisions happened:

```json
{
  "dpd": 0,
  "days_since_last_loan": 45,
  "aa_available": true,
  "amount_requested": 50000,
  "decision": "AUTO_APPROVED"
}
```

**This saves you in:**
- RBI audits
- Ops escalations
- Customer disputes

---

## ❌ What NOT to Do

- ❌ One giant service with 100 if-else statements
- ❌ Hard-coding PDF logic
- ❌ Skipping workflow state tracking
- ❌ No audit trail

---

## 🚀 Next Steps - Implementation Support

If you need assistance with:

- ✅ Exact DB schema (Prisma / SQL)
- ✅ State transition table
- ✅ Rule JSON format
- ✅ NestJS module structure
- ✅ BullMQ / SQS integration
- ✅ CRM bucket mapping logic

Feel free to request detailed implementation guidance for any of these components.

---

## 📝 Notes

This architecture prioritizes:
- **Maintainability** - Rules are configurable, not hard-coded
- **Auditability** - Every decision is tracked and explainable
- **Scalability** - Workflow-based approach handles complex scenarios
- **Compliance** - Built-in audit trails for regulatory requirements

---

**Version:** 2.0  
**Last Updated:** 2025

# 📄 Onboarding Reminder Communication Framework

## Journey: Loan Application Onboarding  
**Objective:** Reduce onboarding drop-offs and maximize completion using timed, multi-channel reminder communications.

---

## 1. Overview

This document defines a **4-step reminder framework** used to re-engage users who drop off during the loan onboarding journey.

Each reminder is driven by:
- User inactivity
- Current onboarding step
- Previous reminder state

For every reminder, the system enforces:
- Step validation
- Channel correctness
- Provider template mapping
- Attribution and conversion tracking
- Compliance with user consent

---

## 2. Supported Onboarding Steps

| Step Number | Step Name |
|------------|-----------|
| 0, 1 | Phone Verification |
| 2 | Email Verification |
| 3 | Loan Application |
| 5 | KYC |
| 6 | Bank Details |
| 7 | Personal Information |
| 8 | Employment Information |
| 9 | Selfie Verification |

---

## 3. Journey Classification

| Attribute | Value |
|---------|------|
| Journey Type | `onboarding_journey` |
| Provider Message ID | `onboarding_journey` |
| Reminder Codes | `_REMINDER_1`, `_REMINDER_2`, `_REMINDER_3`, `_REMINDER_4` |
| Drop-off Condition | User has **not progressed** to the next onboarding step |

---

## 4. Reminder Specifications

---

### 🔔 Reminder 1 – Immediate Nudge

**Purpose**  
A gentle reminder to resume onboarding shortly after inactivity.

**Trigger**
- User inactive for defined threshold (30–60 minutes)
- Onboarding not completed

**Channel**
- WhatsApp (Primary)

**Applicable Steps**
- `0, 1, 2, 3, 5, 6, 7, 8, 9`

**Provider Template Mapping**

| Step Group | Template ID |
|----------|-------------|
| Phone / Email / Personal Info (0,1,2,7) | `onboarding_journey_wa_template_1` |
| Bank / Employment / KYC / Selfie (5,6,8,9) | `onboarding_journey_wa_template_2` |
| Loan Details (3) | `onboarding_journey_wa_template_3` |

**Tracking Rules**
- `template_code` → `*_REMINDER_1`
- Channel must be `WHATSAPP`

---

### 🔔 Reminder 2 – Follow-up Reminder

**Purpose**  
Re-engage users who did not respond to Reminder 1.

**Trigger**
- Reminder 1 sent
- User still inactive after defined delay

**Channel (Step-based)**

| Steps | Channel |
|-----|--------|
| 0,1,2,7 | WhatsApp |
| 3,5,6,8,9 | Email |

**Provider Template Mapping**

| Channel | Template |
|------|----------|
| WhatsApp | `onboarding_journey_wa_template_1` |
| Email | Standard onboarding email |

**Tracking Rules**
- `template_code` → `*_REMINDER_2`
- Channel must match step mapping

---

### 🔔 Reminder 3 – Strong Push

**Purpose**  
High-intent reminder with more detailed messaging.

**Trigger**
- Reminder 2 sent
- User still inactive

**Channel**
- Email only

**Applicable Steps**
- `3, 5, 6, 8`

**Provider Template**
- Email template only (no WhatsApp / IVR)

**Tracking Rules**
- `template_code` → `*_REMINDER_3`
- Channel validation → `EMAIL`

---

### 🔔 Reminder 4 – Final Attempt

**Purpose**  
Final communication attempt before stopping reminders.

**Trigger**
- Reminder 3 sent
- User inactive beyond final threshold

**Channel**
- Email (Final Notice)

**Applicable Steps**
- `3, 5, 6, 8, 9`

**Messaging Guidelines**
- Urgency-focused tone
- Highlight benefits and next steps
- Optional soft deadline or expiry

**Tracking Rules**
- `template_code` → `*_REMINDER_4`
- Channel → `EMAIL`

---

## 5. Scheduling Rules (Recommended)

| Reminder | Delay From Last Action |
|--------|-----------------------|
| Reminder 1 | 30–60 minutes |
| Reminder 2 | +24 hours |
| Reminder 3 | +48 hours |
| Reminder 4 | +72 hours |

**Important**
- Reminder must **not fire** if onboarding step has changed.
- Only one reminder per stage is allowed.

---

## 6. Attribution & Conversion Tracking

### Required Metadata (per reminder)
- `template_code`
- `provider_message_id`
- `channel`
- `scheduled_at`
- `status`

### Conversion Logic
- If user completes onboarding after a reminder:
  - Attribute conversion to **last successfully delivered reminder**
  - Use a **secondary attribution tag** (not UTM)

---

## 7. Stop Conditions

All reminders must stop if:
- User completes onboarding
- User becomes inactive or blocked
- User opts out of communication

---

## 8. Compliance & Consent

Consent is captured during:
- Phone verification
- Email verification

**Mandatory T&C Clause**
> “We may use your phone number and email for onboarding reminders and application updates.”

---

## 9. Reporting Metrics

Track the following daily:

- Total reminders sent
- Delivery success rate
- Channel mismatch count
- Step-wise conversion
- Reminder-wise completion rate

---

## 10. Summary Flow

```text
User Drop-off
   ↓
Reminder 1 (WhatsApp)
   ↓
Reminder 2 (WhatsApp / Email)
   ↓
Reminder 3 (Email)
   ↓
Reminder 4 (Final Email)
   ↓
Stop

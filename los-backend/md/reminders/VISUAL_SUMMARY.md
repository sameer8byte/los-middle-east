# Reminder Queue System - Visual Summary

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REMINDER QUEUE SYSTEM                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────────┐
                              │   Database (Users)   │
                              │                      │
                              │ - User Data          │
                              │ - Onboarding Step    │
                              │ - Updated At         │
                              │ - Active Status      │
                              └──────────┬───────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌─────────────────────┐  ┌──────────────────┐  ┌──────────────┐
        │ ReminderCreator     │  │ ReminderDispatcher   │ Audit Logs  │
        │ (Every 15 min)      │  │ (Every 1 min)    │  │              │
        │                     │  │                  │  │ Tracks all   │
        │ CREATE PENDING      │  │ CREATE IN_PROGRESS   │ events       │
        │ reminders           │  │ reminders        │  │              │
        └──────────┬──────────┘  └─────────┬────────┘  └──────────────┘
                   │                       │
                   │ (PENDING)             │ (Batch to SQS)
                   │                       │
                   ▼                       ▼
        ┌──────────────────────────────────────┐
        │         user_reminders Table         │
        │                                      │
        │ - id                                 │
        │ - user_id                            │
        │ - template_code                      │
        │ - channel (WhatsApp/Email/SMS/IVR)   │
        │ - status (PENDING → IN_PROGRESS →    │
        │          SUCCESS/FAILED)             │
        │ - payload (message data)             │
        │ - retry_count                        │
        │ - created_at, updated_at             │
        └──────────────────────────────────────┘
                   │
                   │ (IN_PROGRESS)
                   │
                   ▼
        ┌──────────────────────────┐
        │    AWS SQS Queue         │
        │  (reminder messages)     │
        └──────────────────────────┘
                   │
                   │ (Polls)
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │      SQS Worker Service              │
        │  (Separate Service)                  │
        │                                      │
        │ ├─ WhatsApp Sender                   │
        │ ├─ Email Sender                      │
        │ ├─ SMS Sender                        │
        │ └─ IVR Caller                        │
        │                                      │
        │ Updates: SUCCESS or FAILED           │
        └──────────────────────────────────────┘
```

---

## ⏰ Cron Schedule Timeline

```
Time          Event                          Status
─────────────────────────────────────────────────────────
00:00         Day starts
:15           ✅ Creator runs                PENDING reminders created
:16-:30       🔄 Dispatcher window           
:30           ✅ Creator runs                PENDING reminders created
:31-:59       🔄 Dispatcher window
:45           ✅ Creator runs                PENDING reminders created
:46-:59       🔄 Dispatcher window
:00           ✅ Dispatcher runs (5-10x)     IN_PROGRESS, sent to SQS
:01-:14       🔄 Creator window
:15           ✅ Creator runs                PENDING reminders created
:16-:30       🔄 Dispatcher window
...           Repeats every 15 min (creator) and every 1 min (dispatcher)
23:45         ✅ Creator runs                PENDING reminders created
23:59         End of day

Legend:
✅ Active window
🔄 Passive window (service may run)
```

---

## 🧠 Decision Flow (Creator)

```
User in Database?
│
├─ NO → Skip
│
└─ YES → Check isActive?
    │
    ├─ NO → Skip
    │
    └─ YES → Check onboardingStep?
        │
        ├─ NOT IN [0,1,2,3,5,6,7,8,9] → Skip
        │
        └─ IN [0,1,2,3,5,6,7,8,9] → Check updatedAt?
            │
            ├─ NOT today (IST) → Skip
            │
            └─ TODAY (IST) → Check if 30+ min idle?
                │
                ├─ NO (updated < 30 min ago) → Skip
                │
                └─ YES (idle 30+ min) → Check existing reminders?
                    │
                    ├─ EXISTS → Skip (prevent duplicate)
                    │
                    └─ NOT EXISTS → ✅ CREATE REMINDER
                        │
                        ├─ Select Channel
                        │ ├─ 10:00-20:00 IST → WHATSAPP
                        │ └─ Otherwise → EMAIL
                        │
                        ├─ Map Onboarding Step to Template
                        │ ├─ Step 0-1 → PhoneVerification
                        │ ├─ Step 2 → EmailVerification
                        │ ├─ Step 3 → LoanApplication
                        │ └─ ... (see mapping table)
                        │
                        └─ Insert to user_reminders table
                            Status: PENDING
```

---

## 🔄 Message Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                   MESSAGE LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

Step 1: CREATED (ReminderCreatorService - Every 15 min)
┌────────────────────────────────────┐
│ user_reminders.status = "PENDING"  │
│ Inserted: 5-10 per 15 minutes      │
└────────────────────────────────────┘
         │ (waits for dispatcher)
         ▼
Step 2: DISPATCHED (ReminderQueueDispatcherService - Every 1 min)
┌────────────────────────────────────┐
│ Fetch PENDING reminders (up to 500)│
│ Build payloads with context        │
│ Send to AWS SQS (batches of 10)    │
│ user_reminders.status = "IN_PROGRESS"
└────────────────────────────────────┘
         │ (sent to SQS)
         ▼
Step 3: PROCESSING (SQS Worker - Whenever available)
┌────────────────────────────────────┐
│ Poll SQS queue                     │
│ Route to provider:                 │
│ ├─ WhatsApp API                    │
│ ├─ Email Service                   │
│ ├─ SMS Gateway                     │
│ └─ IVR System                      │
└────────────────────────────────────┘
         │ (sent to user)
         ▼
Step 4: COMPLETED (SQS Worker)
┌────────────────────────────────────┐
│ user_reminders.status = "SUCCESS"  │
│ OR                                 │
│ user_reminders.status = "FAILED"   │
│ (with retry_count++)               │
│                                    │
│ Max retries: 3                     │
└────────────────────────────────────┘

Timeline Example:
─────────────────
15:30 - Created (PENDING)
15:35 - Dispatched (IN_PROGRESS)
15:37 - Processed (SUCCESS)
────────── 2 minutes from create to delivery
```

---

## 📊 Time-Based Channel Selection

```
IST Time           Channel
─────────────────────────────────
00:00              EMAIL 📧
   ↓
06:00              EMAIL 📧
   ↓
10:00              SWITCH TO WHATSAPP 💬
   ↓
14:00              WHATSAPP 💬
   ↓
18:00              WHATSAPP 💬
   ↓
20:00              SWITCH TO EMAIL 📧
   ↓
23:59              EMAIL 📧

Rationale:
- Morning (20:00-10:00): Users sleep, Email async better
- Day (10:00-20:00): Users awake, WhatsApp more engaging
```

---

## 📋 Template by Onboarding Step

```
User Journey with Auto-Reminders
─────────────────────────────────────────────────────────────

Step 0-1: Phone Verification
│
├─ Template: "PhoneVerification"
├─ Message: "Verify your phone number"
├─ Channel: WhatsApp (if 10-20 IST) or Email
├─ Retry: Up to 3 times
│
└─ User Action: Verify phone → Move to Step 2

Step 2: Email Verification
│
├─ Template: "EmailVerification"
├─ Message: "Verify your email address"
├─ Channel: WhatsApp or Email
├─ Retry: Up to 3 times
│
└─ User Action: Verify email → Move to Step 3

Step 3: Loan Application Start
│
├─ Template: "LoanApplication"
├─ Message: "Begin your loan application"
├─ Channel: WhatsApp or Email
├─ Retry: Up to 3 times
│
└─ User Action: Start application → Move to Step 5

Step 5: KYC (PAN)
│
├─ Template: "LoanApplicationKyc"
├─ Message: "Verify with PAN card"
├─ Channel: WhatsApp or Email
├─ Retry: Up to 3 times
│
└─ User Action: Submit PAN → Move to Step 6

... (continues for steps 6, 7, 8, 9)

User completes all steps → Application submitted → SUCCESS
```

---

## 🗄️ Database Schema Overview

```
users table (EXISTING)
├─ id: UUID
├─ email: String
├─ phoneNumber: String
├─ onboardingStep: Integer
├─ isActive: Boolean
├─ createdAt: DateTime
├─ updatedAt: DateTime
└─ ... (other fields)

        ▼ (1:N relationship)

user_reminders table (NEW)
├─ id: UUID (PK)
├─ user_id: UUID (FK → users.id)
├─ template_code: String
├─ channel: String (WHATSAPP|EMAIL|SMS|IVR)
├─ scheduled_at: DateTime
├─ status: String (PENDING|IN_PROGRESS|SUCCESS|FAILED)
├─ provider_message_id: String
├─ payload: JSON
├─ last_error: String
├─ retry_count: Integer
├─ created_at: DateTime
├─ updated_at: DateTime
└─ Indexes:
   ├─ user_id (for fast lookup by user)
   ├─ status (for filtering by status)
   └─ scheduled_at (for time-based queries)

        ▼ (1:N relationship)

user_reminder_audit_logs table (NEW)
├─ id: UUID (PK)
├─ user_reminder_id: UUID (FK → user_reminders.id)
├─ event: String (CREATED|DISPATCHED_TO_SQS|SUCCESS|FAILED)
├─ metadata: JSON
└─ created_at: DateTime
```

---

## 🎯 Eligibility Matrix

```
                        Must Be True
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
isActive=true          onboardingStep IN      updatedAt=today (IST)
                       [0,1,2,3,5,6,7,8,9]          AND
                                            30+ minutes idle (IST)
    │                         │                         │
    └─────────────────────────┼─────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    ▼                    ▼
        ✅ NOT EXISTS in          ✅ ELIGIBLE FOR
        user_reminders             REMINDER
        (no pending reminder)       (will be created)
```

---

## 📡 API Response Examples

```
POST /api/v1/queue/create-reminders
─────────────────────────────────────
Status: 200 OK
Body: {
  "success": true,
  "message": "Reminder creation process triggered"
}


POST /api/v1/queue/dispatch-reminders
──────────────────────────────────────
Status: 200 OK
Body: {
  "success": true,
  "count": 150,
  "message": "150 reminders dispatched to SQS queue"
}


GET /api/v1/queue/creation-stats
────────────────────────────────
Status: 200 OK
Body: {
  "createdToday": 500,
  "createdThisHour": 42,
  "eligibleUsers": 1250
}


GET /api/v1/queue/stats
───────────────────────
Status: 200 OK
Body: {
  "pending": 150,
  "inProgress": 45,
  "success": 1234,
  "failed": 12,
  "totalRetries": 156
}
```

---

## 🔐 Guard Mechanisms

```
Only ONE Cron Worker Per Instance Group
════════════════════════════════════════

Cluster Setup (Multiple Instances)
├─ Instance 1: CRON_ENABLED=true  → Runs cron jobs ✅
├─ Instance 2: CRON_ENABLED=false → Skips cron jobs ⏭️
├─ Instance 3: CRON_ENABLED=false → Skips cron jobs ⏭️
└─ Instance 4: CRON_ENABLED=false → Skips cron jobs ⏭️

CronGuardService checks:
  if (!this.cronGuardService.isCronEnabled()) {
    return; // Skip execution
  }

Prevents:
  ❌ Duplicate reminders (multiple creates)
  ❌ Race conditions in dispatcher
  ❌ Database lock contention
```

---

## 📈 Expected Performance

```
Volume per Day
──────────────

Eligible Users:           500 - 1000
Reminders Created:        500 - 1000 (5-10 per 15 min)
Reminders Dispatched:     300 - 500 (30-50 per 1 min)
SQS Messages Sent:        ~300 - 500
Success Rate:             >95%
Database Queries:         ~100 per minute (batched)
CPU Impact:               <5%
Memory Impact:            <10%
SQS Cost:                 ~$0.40/month

Database Size
─────────────
New tables: ~50MB/month (with moderate volume)
Indexes: ~10MB
Query time: <100ms (with indexes)
```

---

## 🚨 Error Handling

```
Error Scenarios & Recovery
──────────────────────────

User Not Found
├─ Logs warning
├─ Marks reminder FAILED
└─ Continues with next user
   (doesn't crash batch)

SQS Service Not Available
├─ Logs warning
├─ Skips dispatch
├─ Reminders stay PENDING
└─ Will retry next run

Template Not Found
├─ Uses default template
├─ Logs error
└─ Reminder still sent

Database Query Fails
├─ Logs full error
├─ Returns gracefully
└─ Cron job completes

Max Retries Exceeded
├─ Reminder marked FAILED
├─ Logged in audit table
└─ Manual investigation needed
```

---

## ✅ Quality Checklist

```
Code Quality
─────────────
✅ No TypeScript errors
✅ No lint warnings
✅ Proper error handling
✅ Comprehensive logging
✅ Batch query optimization
✅ Type safety throughout

Features
─────────
✅ Automatic user detection
✅ Time-based channel selection
✅ Duplicate prevention
✅ Retry mechanism
✅ Audit logging
✅ Statistics endpoints
✅ Manual trigger endpoints

Documentation
──────────────
✅ Architecture diagram
✅ API documentation
✅ Database schema
✅ Setup guide
✅ Troubleshooting guide
✅ Deployment checklist
✅ Configuration guide
✅ Example queries
```

---

Generated: 6 February 2026

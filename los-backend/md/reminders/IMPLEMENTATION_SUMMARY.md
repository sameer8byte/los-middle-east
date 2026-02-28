# Reminder Queue System - Implementation Summary

## What Was Created

### 1. **ReminderCreatorService** (`reminder-creator.service.ts`)
A new NestJS service that runs every 15 minutes to identify and create reminders for eligible users.

**Key Features:**
- ✅ Automated user eligibility detection
- ✅ Intelligent channel selection (WhatsApp 10:00-20:00 IST, Email otherwise)
- ✅ Batch reminder creation
- ✅ Audit logging
- ✅ Statistics tracking

**Eligibility Criteria:**
```
┌─────────────────────────────────────────┐
│  SELECT eligible users WHERE:           │
├─────────────────────────────────────────┤
│ ✓ isActive = true                       │
│ ✓ onboardingStep ∈ [0,1,2,3,5,6,7,8,9] │
│ ✓ Updated today (IST)                   │
│ ✓ Last updated > 30 mins ago (IST)      │
│ ✓ No existing pending reminders         │
└─────────────────────────────────────────┘
```

### 2. **Queue Module Update** (`queue.module.ts`)
Updated to register the new `ReminderCreatorService` alongside the existing dispatcher.

### 3. **Queue Controller Update** (`queue.controller.ts`)
Added two new endpoints:
- `POST /api/v1/queue/create-reminders` - Manual trigger for reminder creation
- `GET /api/v1/queue/creation-stats` - View creation statistics

### 4. **Documentation** (`REMINDER_QUEUE_SETUP.md`)
Comprehensive guide covering architecture, configuration, and troubleshooting.

---

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVERY 15 MINUTES                              │
│                                                                   │
│  ReminderCreatorService::createScheduledReminders()             │
│  ├─ Check cron guard (only runs on cron worker)               │
│  ├─ Query users updated today + idle 30+ mins                 │
│  ├─ Determine channel by IST time                             │
│  │  ├─ 10:00-20:00 IST → WHATSAPP                            │
│  │  └─ 20:00-10:00 IST → EMAIL                               │
│  ├─ Map onboarding step → template code                       │
│  ├─ Batch create reminders (user_reminders table)             │
│  └─ Log to audit table                                        │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ (PENDING status)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EVERY 1 MINUTE                               │
│                                                                   │
│  ReminderQueueDispatcherService::dispatchScheduledReminders()   │
│  ├─ Fetch up to 500 PENDING reminders                          │
│  ├─ Batch fetch user & loan details                            │
│  ├─ Build tracking payloads with context                       │
│  │  ├─ Template code                                           │
│  │  ├─ User details (email, phone, etc)                        │
│  │  ├─ Brand info                                              │
│  │  ├─ Message context (onboarding step)                       │
│  │  └─ Email HTML from universal wrapper template             │
│  ├─ Group by channel (WHATSAPP, EMAIL, SMS, IVR)              │
│  ├─ Send to AWS SQS in chunks of 10                           │
│  ├─ Update status to IN_PROGRESS                               │
│  └─ Log to audit table                                         │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ (IN_PROGRESS status)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               AWS SQS Worker (Separate Service)                  │
│                                                                   │
│  ├─ Poll messages from reminder queue                           │
│  ├─ Send via provider (WhatsApp, Email, SMS, IVR)              │
│  ├─ Update reminder status → SUCCESS or FAILED                 │
│  └─ Log delivery tracking                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Onboarding Step → Template Mapping

| Step | Template | Description |
|------|----------|-------------|
| 0-1 | PhoneVerification | "Verify your phone number" |
| 2 | EmailVerification | "Verify your email address" |
| 3 | LoanApplication | "Begin your loan application" |
| 5 | LoanApplicationKyc | "Verify with PAN card" |
| 6 | LoanApplicationBankDetails | "Provide bank account details" |
| 7 | LoanApplicationPersonalInfo | "Enter personal information" |
| 8 | LoanApplicationEmploymentInfo | "Share employment details" |
| 9 | LoanApplicationSelfie | "Provide identity selfie" |

---

## Database Tables

### user_reminders
```
id                    UUID (PK)
user_id              UUID (FK → users)
template_code        String (e.g., "PhoneVerification")
channel              String ("WHATSAPP" | "EMAIL" | "SMS" | "IVR")
scheduled_at         DateTime
status               String ("PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED")
provider_message_id  String (e.g., "onboarding_journey")
payload              JSON (WhatsApp/Email content)
last_error           String
retry_count          Integer (max 3)
created_at           DateTime
updated_at           DateTime
```

**Indexes:**
```sql
CREATE INDEX user_reminders_user_id_idx ON user_reminders(user_id);
CREATE INDEX user_reminders_status_idx ON user_reminders(status);
CREATE INDEX user_reminders_scheduled_at_idx ON user_reminders(scheduled_at);
```

---

## Configuration Constants

### In ReminderCreatorService
```typescript
@Cron("*/15 * * * *")  // Every 15 minutes
// Time-based channel selection:
// 10:00-20:00 IST → WHATSAPP
// 20:00-10:00 IST → EMAIL
```

### In ReminderQueueDispatcherService
```typescript
const BATCH_SIZE = 500;      // Max reminders per cron run
const MAX_RETRIES = 3;       // Retry attempts before permanent failure
const SQS_BATCH_SIZE = 10;   // AWS SQS max batch size per request
```

---

## API Endpoints

### Test Manually

**Create Reminders:**
```bash
curl -X POST http://localhost:3000/api/v1/queue/create-reminders
```
Response:
```json
{
  "success": true,
  "message": "Reminder creation process triggered"
}
```

**Dispatch Reminders:**
```bash
curl -X POST http://localhost:3000/api/v1/queue/dispatch-reminders
```
Response:
```json
{
  "success": true,
  "count": 150,
  "message": "150 reminders dispatched to SQS queue"
}
```

**Creator Statistics:**
```bash
curl http://localhost:3000/api/v1/queue/creation-stats
```
Response:
```json
{
  "createdToday": 500,
  "createdThisHour": 42,
  "eligibleUsers": 1250
}
```

**Dispatcher Statistics:**
```bash
curl http://localhost:3000/api/v1/queue/stats
```
Response:
```json
{
  "pending": 150,
  "inProgress": 45,
  "success": 1234,
  "failed": 12,
  "totalRetries": 156
}
```

---

## Query Examples

### Count eligible users right now
```sql
SELECT COUNT(*) as eligible_count
FROM "users" u
WHERE u."isActive" = true
  AND u."onboardingStep" IN (0, 1, 2, 3, 5, 6, 7, 8, 9)
  AND (u."updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
      = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
  AND (u."updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
      <= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' - INTERVAL '30 minutes')
  AND NOT EXISTS (
    SELECT 1 FROM "user_reminders" ur WHERE ur.user_id = u.id
  );
```

### View reminders by status and channel
```sql
SELECT status, channel, COUNT(*) as count
FROM "user_reminders"
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status, channel
ORDER BY status, channel;
```

### View recent errors
```sql
SELECT id, user_id, template_code, channel, last_error, retry_count, created_at
FROM "user_reminders"
WHERE status = 'FAILED'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### View audit trail
```sql
SELECT event, COUNT(*) as count, MAX(created_at) as last_event
FROM "user_reminder_audit_logs"
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event
ORDER BY MAX(created_at) DESC;
```

---

## How It Works - Step by Step

### Minute 0:15
1. **ReminderCreatorService** runs
2. Queries database for eligible users (last 5-10 users updated that day)
3. Creates reminders with status = PENDING
4. Reminders appear in `user_reminders` table

### Minute 1:00
1. **ReminderQueueDispatcherService** runs
2. Fetches all PENDING reminders (up to 500)
3. For each reminder:
   - Fetches user details
   - Fetches loan details (if exists)
   - Builds tracking payload with personalization
   - Renders email HTML from template
4. Groups by channel (WHATSAPP, EMAIL, etc.)
5. Sends to AWS SQS in batches of 10
6. Updates reminder status to IN_PROGRESS
7. Logs to audit table

### In AWS Worker
1. SQS worker polls reminder queue
2. Processes based on channel:
   - **WhatsApp**: Sends via WhatsApp Business API
   - **Email**: Sends via email service
   - **SMS**: Sends via SMS gateway
   - **IVR**: Triggers IVR call
3. Updates reminder status → SUCCESS or FAILED
4. Updates retry count if failed

---

## Environment Variables Needed

```bash
# Required for the service to work
CRON_ENABLED=true                          # Enable cron jobs (on one instance)
SQS_REMINDER_QUEUE_URL=https://sqs...      # AWS SQS queue URL
DATABASE_URL=postgresql://...              # PostgreSQL connection

# Optional - for local testing
NODE_ENV=development                       # development/staging/production
```

---

## Deployment Checklist

- [ ] Create `user_reminders` and `user_reminder_audit_logs` tables (via Prisma migration)
- [ ] Create database indexes for performance
- [ ] Set `CRON_ENABLED=true` on your cron worker instance
- [ ] Set `SQS_REMINDER_QUEUE_URL` environment variable
- [ ] Configure AWS IAM role with SQS permissions
- [ ] Test manual endpoints first
- [ ] Monitor logs for first 24 hours
- [ ] Verify email template path exists: `src/templates/partner/ejs/universal-email-wrapper.ejs`
- [ ] Check IST timezone is correctly configured in PostgreSQL

---

## Performance Notes

**Expected Load:**
- 500-1000 eligible users per day (distributed across hours)
- 5-10 reminders created every 15 minutes
- 30-50 reminders dispatched every 1 minute
- ~300+ SQS messages per day

**Database Impact:**
- Low: Only INSERT queries during creation, SELECT during dispatch
- Reads are batched (O(n) lookups, not O(n²))
- All indexes are in place for fast filtering

**Cost Optimization:**
- SQS: ~0.40/month for typical volume
- Database: Minimal impact (optimized batch queries)
- No API calls except to AWS SQS

---

## Troubleshooting

### Issue: Reminders not being created
**Solution:**
1. Check `CRON_ENABLED=true` on your cron worker
2. Verify user is in correct onboarding step (0,1,2,3,5,6,7,8,9)
3. Check if user was updated today (IST)
4. Check if more than 30 mins have passed since last update
5. Verify no existing reminder already exists

### Issue: Reminders not being dispatched
**Solution:**
1. Check `SQS_REMINDER_QUEUE_URL` is set
2. Verify AWS IAM role has SQS:SendMessage permission
3. Check CloudWatch logs for SQS errors
4. Verify reminder status is PENDING
5. Check retry_count < 3

### Issue: Email template not rendering
**Solution:**
1. Verify path: `src/templates/partner/ejs/universal-email-wrapper.ejs` exists
2. Check template variables in logs
3. Verify brand data is loaded correctly
4. Test EJS rendering separately

---

## Next Steps

1. **Run Prisma migration** to create tables
2. **Deploy** with `CRON_ENABLED=true` on cron worker
3. **Monitor** first 24 hours with stats endpoints
4. **Adjust** BATCH_SIZE/schedule if needed based on volume
5. **Add** more onboarding steps as they're implemented

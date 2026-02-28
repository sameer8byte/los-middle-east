✅ COMPLETE SQS SETUP — user-reminder-queue

AWS Account: 607837044004
Region: ap-south-1

1️⃣ Create User Reminder DLQ
aws sqs create-queue \
  --region ap-south-1 \
  --queue-name user-reminder-dlq
2️⃣ Get User Reminder DLQ URL
aws sqs get-queue-url \
  --region ap-south-1 \
  --queue-name user-reminder-dlq

Expected:

https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-dlq
3️⃣ Get User Reminder DLQ ARN
aws sqs get-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-dlq \
  --attribute-names QueueArn

Expected:

arn:aws:sqs:ap-south-1:607837044004:user-reminder-dlq
4️⃣ Create User Reminder Main Queue
aws sqs create-queue \
  --region ap-south-1 \
  --queue-name user-reminder-queue
5️⃣ Get User Reminder Queue URL
aws sqs get-queue-url \
  --region ap-south-1 \
  --queue-name user-reminder-queue

Expected:

https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-queue
6️⃣ Configure User Reminder Queue (Redrive + Tuning)
aws sqs set-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-queue \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:ap-south-1:607837044004:user-reminder-dlq\",\"maxReceiveCount\":\"3\"}"
  }'
Why these values?
Setting	Value	Reason
VisibilityTimeout	300s	WhatsApp / Email API latency
Retention	4 days	Reminder retry window
Long polling	20s	Cost + efficiency
maxReceiveCount	3	Avoid spamming users
7️⃣ (Optional but Recommended) Enable SSE
Main Queue
aws sqs set-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-queue \
  --attributes '{"SqsManagedSseEnabled":"true"}'
DLQ
aws sqs set-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-dlq \
  --attributes '{"SqsManagedSseEnabled":"true"}'
8️⃣ Add User Reminder SQS Permissions to EXISTING ROLE

⚠️ Run from admin machine / admin EC2

Create policy file
cat > user-reminder-sqs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UserReminderSQSAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": [
        "arn:aws:sqs:ap-south-1:607837044004:user-reminder-queue",
        "arn:aws:sqs:ap-south-1:607837044004:user-reminder-dlq"
      ]
    }
  ]
}
EOF
Attach to existing NOC role
aws iam put-role-policy \
  --role-name EC2-NOC-Processing-Role \
  --policy-name User-Reminder-SQS-Policy \
  --policy-document file://user-reminder-sqs-policy.json

✅ Safe to run
✅ No downtime
✅ Policy overwrites if already exists

9️⃣ Verify Queue Configuration
aws sqs get-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-queue \
  --attribute-names All

Check:

RedrivePolicy exists

VisibilityTimeout = 300

maxReceiveCount = 3

🔟 Send Test Message
aws sqs send-message \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-queue \
  --message-body '{
    "templateCode":"PhoneVerification",
    "channel":"WHATSAPP",
    "userId":"test-user-123",
    "scheduledAt":"2026-02-06T18:30:00Z"
  }'
1️⃣1️⃣ Receive Test Message
aws sqs receive-message \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/user-reminder-queue
✅ FINAL STATE (What You Now Have)
Queue	Purpose
noc-processing-queue	Core business
audit-logs-queue	Compliance
user-reminder-queue	Notifications
Each queue	Has its OWN DLQ

✔ Clean isolation
✔ Correct retry logic
✔ Same EC2 role reused
✔ Production-safe

If you want next:

🔁 DLQ replay commands for reminders

⏰ Delayed reminder strategy

🚀 NestJS reminder worker

📊 CloudWatch alarms

🧱 Terraform diff

Just tell me 👍
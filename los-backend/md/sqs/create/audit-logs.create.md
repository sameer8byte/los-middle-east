Perfect 👍
Below are ONLY COMPLETE, COPY-PASTE-READY COMMANDS for Audit Logs SQS setup, assuming:

✅ NOC SQS + IAM role already exists

✅ Same EC2 & IAM role will be reused

❌ No re-creation of NOC infra

❌ No aws configure on EC2

Account: 607837044004
Region: ap-south-1

✅ COMPLETE COMMANDS — AUDIT LOGS SQS SETUP
1️⃣ Create Audit Logs DLQ
aws sqs create-queue \
  --region ap-south-1 \
  --queue-name audit-logs-dlq-sfs
2️⃣ Get Audit Logs DLQ URL
aws sqs get-queue-url \
  --region ap-south-1 \
  --queue-name audit-logs-dlq-sfs
3️⃣ Get Audit Logs DLQ ARN
aws sqs get-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/audit-logs-dlq-sfs \
  --attribute-names QueueArn
4️⃣ Create Audit Logs Main Queue
aws sqs create-queue \
  --region ap-south-1 \
  --queue-name audit-logs-queue-sfs
5️⃣ Get Audit Logs Main Queue URL
aws sqs get-queue-url \
  --region ap-south-1 \
  --queue-name audit-logs-queue-sfs
6️⃣ Configure Audit Logs Queue (Redrive + Tuning)
aws sqs set-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/audit-logs-queue-sfs \
  --attributes '{
    "VisibilityTimeout": "120",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:ap-south-1:607837044004:audit-logs-dlq-sfs\",\"maxReceiveCount\":\"5\"}"
  }'
7️⃣ (Optional but Recommended) Enable SSE on Both Queues
aws sqs set-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/audit-logs-queue-sfs \
  --attributes '{"SqsManagedSseEnabled":"true"}'
aws sqs set-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/audit-logs-dlq-sfs \
  --attributes '{"SqsManagedSseEnabled":"true"}'
8️⃣ Add Audit SQS Permissions to EXISTING EC2 ROLE

⚠️ Run from admin machine / admin EC2

Create policy file
cat > audit-sqs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AuditLogsSQSAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": [
        "arn:aws:sqs:ap-south-1:607837044004:audit-logs-queue-sfs",
        "arn:aws:sqs:ap-south-1:607837044004:audit-logs-dlq-sfs"
      ]
    }
  ]
}
EOF
Attach policy to existing NOC role
aws iam put-role-policy \
  --role-name EC2-NOC-Processing-Role \
  --policy-name Audit-Logs-SQS-Policy \
  --policy-document file://audit-sqs-policy.json
9️⃣ Verify Queue Configuration
aws sqs get-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/audit-logs-queue-sfs \
  --attribute-names All
🔟 Send Test Message (Sanity Check)
aws sqs send-message \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/audit-logs-queue-sfs \
  --message-body '{"event":"AUDIT_TEST","source":"system","ts":"2026-02-06T18:30:00Z"}'
1️⃣1️⃣ Receive Test Message
aws sqs receive-message \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/607837044004/audit-logs-queue-sfs
✅ DONE — NOTHING ELSE REQUIRED

✔ NOC untouched
✔ Audit isolated
✔ Same EC2 role reused
✔ DLQ protection enabled
✔ Production-safe

If you want next (just say the number):
1️⃣ DLQ replay commands
2️⃣ NestJS dual-queue consumer code
3️⃣ CloudWatch alarms (exact commands)
4️⃣ Terraform (only audit diff)
5️⃣ Audit log JSON schema
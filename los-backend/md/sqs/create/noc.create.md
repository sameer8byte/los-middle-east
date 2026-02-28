SOP: EC2 IAM Role Setup with SQS, S3, SNS Access & Queue Configuration
1. Purpose
This SOP describes the procedure to:
Create an IAM Role for EC2


Attach required permissions (SQS, S3, SNS)


Attach the role to an EC2 instance


Create and configure SQS queues with a Dead Letter Queue (DLQ)



2. Scope
Applicable to AWS environments where an EC2 instance needs:
Access to SQS (send/receive/delete messages)


Access to S3 objects


Ability to publish messages to SNS



3. Prerequisites
AWS CLI installed and configured


IAM permissions to create roles, policies, instance profiles


EC2 instance already created


Region: ap-south-1


AWS Account ID: 753845243240



4. Procedure

Step 1: Create IAM Trust Policy (EC2 Assume Role)
Create a trust policy file to allow EC2 to assume the IAM role.
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

Step 2: Create IAM Permissions Policy
This policy grants access to:
SQS queue operations


S3 object operations


SNS publish access




cat > permissions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:ap-south-1:753845243240:noc-processing-queue"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::prod-zepoto-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:ap-south-1:753845243240:noc-notifications"
    }
  ]
}
EOF


Step 3: Create IAM Role
aws iam create-role \
  --role-name EC2-NOC-Processing-Role \
  --assume-role-policy-document file://trust-policy.json

Step 4: Attach Inline Policy to IAM Role
aws iam put-role-policy \
  --role-name EC2-NOC-Processing-Role \
  --policy-name NOC-Processing-Policy \
  --policy-document file://permissions-policy.json

Step 5: Create IAM Instance Profile
aws iam create-instance-profile \
  --instance-profile-name EC2-NOC-Processing-Profile

Step 6: Add IAM Role to Instance Profile
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-NOC-Processing-Profile \
  --role-name EC2-NOC-Processing-Role
⚠️ Note:
If this command fails initially due to eventual consistency, wait 30–60 seconds and retry.




Step 7: Attach Instance Profile to EC2 Instance
Replace the instance ID with the correct one if needed.
aws ec2 associate-iam-instance-profile \
  --instance-id i-028ff606bdef27ca0 \
  --iam-instance-profile Name=EC2-NOC-Processing-Profile

Step 8: Verify Instance Profile Configuration
aws iam get-instance-profile \
  --instance-profile-name EC2-NOC-Processing-Profile

5. SQS Queue Setup

Step 9: Create Dead Letter Queue (DLQ)
aws sqs create-queue \
  --region ap-south-1 \
  --queue-name noc-processing-dlq

Step 10: Create Main Processing Queue
aws sqs create-queue \
  --region ap-south-1 \
  --queue-name noc-processing-queue


Step 11: Get DLQ ARN
aws sqs get-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/753845243240/noc-processing-dlq \
  --attribute-names QueueArn

Step 12: Configure Main Queue Attributes & Redrive Policy
aws sqs set-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/753845243240/noc-processing-queue \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "345600",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:ap-south-1:753845243240:noc-processing-dlq\",\"maxReceiveCount\":\"3\"}"
  }'

Step 13: Verify Queue Configuration
aws sqs get-queue-attributes \
  --region ap-south-1 \
  --queue-url https://sqs.ap-south-1.amazonaws.com/753845243240/noc-processing-queue \
  --attribute-names All

6. Validation Checklist
IAM Role created successfully


Permissions policy attached


Instance profile attached to EC2


SQS main queue and DLQ created


Redrive policy configured correctly



7. Notes & Best Practices
Prefer managed policies for long-term maintenance if reuse is expected


Follow least privilege principle when expanding permissions


For production, consider:


Encryption (SQS SSE, S3 SSE)


CloudWatch alarms on DLQ depth


Terraform/IaC for repeatability



If you want, I can also:
Convert this into Markdown / Confluence-ready SOP


Convert it into Terraform


Add rollback & troubleshooting steps




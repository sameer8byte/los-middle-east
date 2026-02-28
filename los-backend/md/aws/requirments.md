# AWS Infrastructure Requirements

## Overview

This document describes the **Amazon Web Services (AWS)** infrastructure required to deploy and operate the application in a secure, scalable, and production-ready manner.

The setup includes:

- 3 EC2 instances (Database, Backend, Frontend)
- 2 S3 buckets (Public and Private)
- Amazon SQS for asynchronous processing
- IAM roles and permissions
- VPC networking with public and private subnets

Cloud Provider: Amazon Web Services (AWS)

---

## Architecture Summary

| Component | Count | Purpose                         |
| --------- | ----- | ------------------------------- |
| EC2       | 3     | Database, Backend API, Frontend |
| S3 Bucket | 2     | Public & Private storage        |
| SQS       | 1+    | Background processing           |
| VPC       | 1     | Network isolation               |

---

## EC2 Instances

### 1. Database EC2 Instance

**Purpose**

- Hosts PostgreSQL / MySQL database

**Configuration**

- Instance Type: `t3.large`
- OS: Ubuntu 22.04 LTS
- Root Volume: 30 GB (gp3)
- Data Volume: 100–300 GB (gp3)
- Subnet: Private
- Public IP: ❌ Disabled

**Security Group**

- Inbound:
  - 5432 (PostgreSQL) – Backend EC2 only
- Outbound:
  - All traffic

**IAM Role**

- AmazonCloudWatchAgentServerPolicy
- AmazonSSMManagedInstanceCore

---

### 2. Backend EC2 Instance

**Purpose**

- Runs backend APIs and background workers
- Communicates with DB, S3, and SQS

**Configuration**

- Instance Type: `t3.medium` → `t3.large`
- OS: Ubuntu 22.04 LTS
- Storage: 40–60 GB (gp3)
- Subnet: Private
- Public IP: ❌ Disabled (behind Load Balancer)

**Security Group**

- Inbound:
  - App Port (3000 / 4000) from Load Balancer
- Outbound:
  - Database
  - S3
  - SQS
  - Internet (via NAT)

---

### 3. Frontend EC2 Instance

**Purpose**

- Hosts frontend application (React / Vite / Next.js)
- Served via Nginx

**Configuration**

- Instance Type: `t3.small`
- OS: Ubuntu 22.04 LTS
- Storage: 20–30 GB
- Subnet: Public
- Public IP: ✅ Enabled

**Security Group**

- Inbound:
  - 80 (HTTP)
  - 443 (HTTPS)
- Outbound:
  - Backend API
  - Internet

---

## S3 Buckets

### 1. Public S3 Bucket

**Use Cases**

- Public assets
- Images
- Static documents

**Configuration**

- Block Public Access: ❌ Disabled
- Versioning: Enabled
- Encryption: SSE-S3

**Access**

- Public: GetObject
- Backend EC2: Full access

---

### 2. Private S3 Bucket

**Use Cases**

- Sensitive documents
- Identity & financial files
- Internal reports

**Configuration**

- Block Public Access: ✅ Enabled
- Versioning: Enabled
- Encryption: SSE-KMS (recommended)

**Access**

- Backend EC2 only

---

## Amazon SQS

**Purpose**

- Background jobs
- Workflow automation
- Event processing

**Configuration**

- Queue Type: Standard
- Visibility Timeout: 60–120 seconds
- Dead Letter Queue: Enabled
- Retention Period: 4–7 days

**Permissions**

- SendMessage
- ReceiveMessage
- DeleteMessage
- GetQueueAttributes

---

## IAM Permissions

### Backend EC2 IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::public-bucket/*",
        "arn:aws:s3:::private-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

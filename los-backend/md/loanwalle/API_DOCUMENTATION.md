# Loanwalle Integration API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Endpoints](#endpoints)
5. [Error Handling](#error-handling)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Loanwalle API integration allows partners to programmatically create and manage loan leads. The API supports two authentication methods: **API Keys** and **Partner Bearer Tokens**.

### Key Features

- ✅ Create new loan leads
- ✅ Retrieve lead status and details
- ✅ Multi-authentication support (API Key + Bearer Token)
- ✅ Real-time lead tracking
- ✅ Comprehensive error handling

### Supported Loan Types

- `PERSONAL_LOAN` - Personal loans
- `HOME_LOAN` - Home/mortgage loans
- `AUTO_LOAN` - Automobile loans
- `EDUCATION_LOAN` - Education loans
- `BUSINESS_LOAN` - Business loans

---

## Authentication

### Method 1: API Key (Recommended)

**Best for**: Server-to-server integrations, applications

**How to Get**:

1. Go to Partner Dashboard → Settings → API Keys
2. Click "Create New API Key"
3. Copy the key and store it securely

**Usage**:

```bash
-H "x-api-key: lw_your_secret_key_here"
```

### Method 2: Bearer Token

**Best for**: User-initiated operations, web applications

**How to Get**:

1. Authenticate with partner credentials
2. Token is returned in login response
3. Use token in Authorization header

**Usage**:

```bash
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Security Best Practices

⚠️ **IMPORTANT**:

- Never commit API keys to version control
- Rotate API keys every 90 days
- Use environment variables for storing keys
- Monitor API key usage in dashboard
- Revoke compromised keys immediately

---

## Base URL

```
Production: https://api.loanwalle.com/v1
Staging: https://staging-api.loanwalle.com/v1
Development: http://localhost:4002/api/v1
Local Testing: http://localhost:4002/api/v1
```

---

## Endpoints

### 1. Create Lead

Creates a new loan application lead in the system.

#### Request

```http
POST /loanwalle/leads HTTP/1.1
Host: localhost:4002
Content-Type: application/json
x-api-key: your_api_key_here
```

**Method**: `POST`  
**Path**: `/loanwalle/leads`  
**Status Code**: `201 Created`

#### Headers

| Header          | Required | Value                        |
| --------------- | -------- | ---------------------------- |
| `Content-Type`  | ✅ Yes   | `application/json`           |
| `x-api-key`     | ✅ Yes\* | Your API key                 |
| `Authorization` | ✅ Yes\* | `Bearer token` (alternative) |

\*Either x-api-key or Authorization header is required

#### Request Body

```json
{
  "lead": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "mobile": "string",
    "pan": "string",
    "loan_type": "string",
    "loan_amount": "number"
  }
}
```

#### Parameters

| Parameter   | Type   | Required | Length | Description                 | Example                |
| ----------- | ------ | -------- | ------ | --------------------------- | ---------------------- |
| first_name  | string | ✅ Yes   | 1-100  | Applicant's first name      | "John"                 |
| last_name   | string | ✅ Yes   | 1-100  | Applicant's last name       | "Doe"                  |
| email       | email  | ✅ Yes   | -      | Valid email address         | "john.doe@example.com" |
| mobile      | string | ✅ Yes   | 10     | 10-digit mobile number      | "9876543210"           |
| pan         | string | ✅ Yes   | 10     | PAN card number (uppercase) | "ABCDE1234F"           |
| loan_type   | string | ✅ Yes   | -      | Type of loan                | "PERSONAL_LOAN"        |
| loan_amount | number | ✅ Yes   | -      | Loan amount in INR          | 500000                 |

#### Success Response

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "loanId": "268c1d92-16a2-4e41-a011-2aa6b7b80500"
  }
}
```

#### Error Responses

**400 - Bad Request (Missing Field)**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "PAN number is required",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

**400 - Invalid Email**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid email format",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

**400 - Duplicate PAN**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "PAN number already exists",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

**400 - Duplicate Mobile**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Mobile number already exists for this brand",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

**401 - Unauthorized**

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired API key",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

**422 - Unprocessable Entity**

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Invalid loan type",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

**429 - Rate Limited**

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again after 60 seconds",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

**500 - Server Error**

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

#### cURL Examples

**Basic Request**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads' \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: lw_your_api_key_here' \
  --data-raw '{
    "lead": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "mobile": "9876543210",
      "pan": "ABCDE1234F",
      "loan_type": "PERSONAL_LOAN",
      "loan_amount": 500000
    }
  }'
```

**With Bearer Token**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer your_partner_token_here' \
  --data-raw '{
    "lead": {
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane.smith@example.com",
      "mobile": "9876543211",
      "pan": "XYZAB5678C",
      "loan_type": "HOME_LOAN",
      "loan_amount": 2500000
    }
  }'
```

**With Formatted Output (jq)**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads' \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: lw_your_api_key_here' \
  --data-raw '{
    "lead": {
      "first_name": "Rajesh",
      "last_name": "Kumar",
      "email": "rajesh.kumar@example.com",
      "mobile": "9123456789",
      "pan": "ABCD1234E",
      "loan_type": "PERSONAL_LOAN",
      "loan_amount": 750000
    }
  }' | jq '.data'
```

---

### 2. Get Lead Status

Retrieve current status and details of a specific lead.

#### Request

```http
GET /loanwalle/leads/:leadId HTTP/1.1
Host: localhost:4002
x-api-key: your_api_key_here
```

**Method**: `GET`  
**Path**: `/loanwalle/leads/:leadId`  
**Status Code**: `200 OK`

#### Headers

| Header          | Required | Value                        |
| --------------- | -------- | ---------------------------- |
| `x-api-key`     | ✅ Yes\* | Your API key                 |
| `Authorization` | ✅ Yes\* | `Bearer token` (alternative) |

\*Either x-api-key or Authorization header is required

#### Path Parameters

| Parameter | Type   | Required | Description                  | Example                   |
| --------- | ------ | -------- | ---------------------------- | ------------------------- |
| leadId    | string | ✅ Yes   | Lead ID from create response | "loan_6c7d8e9f0g1h2i3j4k" |

#### Success Response

```json
{
  "success": true,
  "message": "Lead status retrieved successfully",
  "data": {
    "id": "268c1d92-16a2-4e41-a011-2aa6b7b80500",
    "status": "ONBOARDING",
    "amount": 500000,
    "loanType": "PERSONAL_LOAN",
    "applicationDate": "2026-02-07T00:00:00.000Z",
    "approvalDate": null,
    "disbursementDate": null,
    "closureDate": null,
    "createdAt": "2026-02-07T20:25:03.405Z",
    "updatedAt": "2026-02-07T20:25:03.405Z"
  }
}
```

#### Lead Status Values

| Status         | Description                        |
| -------------- | ---------------------------------- |
| `ONBOARDING`   | Application submitted, in progress |
| `UNDER_REVIEW` | Application under review           |
| `APPROVED`     | Loan approved                      |
| `REJECTED`     | Application rejected               |
| `DISBURSED`    | Funds disbursed to applicant       |
| `CLOSED`       | Loan closed/repaid                 |
| `DEFAULTED`    | Loan defaulted                     |

#### Error Responses

**404 - Lead Not Found**

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Lead not found",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads/invalid_id"
}
```

**401 - Unauthorized**

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired API key",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads/loan_id"
}
```

**400 - Invalid Lead ID**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid lead ID format",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

#### cURL Examples

**Basic Request**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads/268c1d92-16a2-4e41-a011-2aa6b7b80500' \
  --header 'x-api-key: lw_your_api_key_here'
```

**With Formatted Output**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads/268c1d92-16a2-4e41-a011-2aa6b7b80500' \
  --header 'x-api-key: lw_your_api_key_here' | jq '.data'
```

**Extract Status Only**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads/268c1d92-16a2-4e41-a011-2aa6b7b80500' \
  --header 'x-api-key: lw_your_api_key_here' | jq '.data.status'
```

**Extract Amount**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads/268c1d92-16a2-4e41-a011-2aa6b7b80500' \
  --header 'x-api-key: lw_your_api_key_here' | jq '.data.amount'
```

**With Bearer Token**

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/leads/268c1d92-16a2-4e41-a011-2aa6b7b80500' \
  --header 'Authorization: Bearer your_partner_token_here'
```

---

### 3. Test API Key

Verify that your API key is valid and authentication is working correctly.

#### Request

```http
GET /loanwalle/test HTTP/1.1
Host: localhost:4002
x-api-key: your_api_key_here
```

**Method**: `GET`  
**Path**: `/loanwalle/test`  
**Status Code**: `200 OK`

#### Success Response

```json
{
  "success": true,
  "message": "API Key authentication is working correctly",
  "timestamp": "2026-02-07T20:16:37.658Z",
  "data": {
    "apiName": "Loanwalle Test Endpoint",
    "description": "This endpoint confirms that your API key is valid and authenticated",
    "version": "1.0.0"
  }
}
```

#### cURL Example

```bash
curl --location 'http://localhost:4002/api/v1/loanwalle/test' \
  -H 'x-api-key: lw_your_api_key_here'
```

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning              | Action                         |
| ----------- | -------------------- | ------------------------------ |
| `200`       | OK                   | Request successful             |
| `201`       | Created              | Resource created successfully  |
| `400`       | Bad Request          | Invalid parameters or format   |
| `401`       | Unauthorized         | Invalid/missing authentication |
| `404`       | Not Found            | Resource not found             |
| `422`       | Unprocessable Entity | Validation error               |
| `429`       | Too Many Requests    | Rate limit exceeded            |
| `500`       | Server Error         | Unexpected server error        |
| `503`       | Service Unavailable  | Server temporarily unavailable |

### Error Response Structure

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Descriptive error message",
  "timestamp": "2026-02-08T10:30:45.123Z",
  "path": "/api/v1/loanwalle/leads"
}
```

### Retry Strategy

Implement exponential backoff for retries:

```javascript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.statusCode >= 500 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Examples

### JavaScript/Node.js Example

```javascript
const axios = require("axios");

const API_KEY = process.env.LOANWALLE_API_KEY;
const BASE_URL = "https://api.loanwalle.com/v1";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
  },
});

// Create Lead
async function createLead(leadData) {
  try {
    const response = await client.post("/loanwalle/leads", {
      lead: leadData,
    });
    console.log("Lead created:", response.data.data);
    return response.data.data;
  } catch (error) {
    console.error("Error creating lead:", error.response.data);
    throw error;
  }
}

// Get Lead Status
async function getLeadStatus(leadId) {
  try {
    const response = await client.get(`/loanwalle/leads/${leadId}`);
    console.log("Lead status:", response.data.data);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching lead:", error.response.data);
    throw error;
  }
}

// Usage
const newLead = await createLead({
  first_name: "John",
  last_name: "Doe",
  email: "john.doe@example.com",
  mobile: "9876543210",
  pan: "ABCDE1234F",
  loan_type: "PERSONAL_LOAN",
  loan_amount: 500000,
});

const status = await getLeadStatus(newLead.loanId);
```

### Python Example

```python
import requests
import os

API_KEY = os.getenv('LOANWALLE_API_KEY')
BASE_URL = 'https://api.loanwalle.com/v1'

headers = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
}

def create_lead(lead_data):
    response = requests.post(
        f'{BASE_URL}/loanwalle/leads',
        json={'lead': lead_data},
        headers=headers
    )
    response.raise_for_status()
    return response.json()

def get_lead_status(lead_id):
    response = requests.get(
        f'{BASE_URL}/loanwalle/leads/{lead_id}',
        headers=headers
    )
    response.raise_for_status()
    return response.json()

# Usage
lead_data = {
    'first_name': 'John',
    'last_name': 'Doe',
    'email': 'john.doe@example.com',
    'mobile': '9876543210',
    'pan': 'ABCDE1234F',
    'loan_type': 'PERSONAL_LOAN',
    'loan_amount': 500000
}

response = create_lead(lead_data)
print('Lead created:', response['data'])

status = get_lead_status(response['data']['loanId'])
print('Lead status:', status['data'])
```

### cURL Workflow Example

```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="https://api.loanwalle.com/v1"

# Test API Key
echo "Testing API Key..."
curl -X GET $BASE_URL/loanwalle/test \
  -H "x-api-key: $API_KEY"

echo "\n\nCreating Lead..."
LEAD_RESPONSE=$(curl -s -X POST $BASE_URL/loanwalle/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "lead": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "mobile": "9876543210",
      "pan": "ABCDE1234F",
      "loan_type": "PERSONAL_LOAN",
      "loan_amount": 500000
    }
  }')

LOAN_ID=$(echo $LEAD_RESPONSE | jq -r '.data.loanId')
echo "Lead created with ID: $LOAN_ID"

echo "\n\nFetching Lead Status..."
curl -s -X GET $BASE_URL/loanwalle/leads/$LOAN_ID \
  -H "x-api-key: $API_KEY" | jq '.data'
```

---

## Troubleshooting

### Issue: "Invalid API Key"

**Cause**: API key is incorrect, expired, or revoked

**Solutions**:

1. Verify API key is correct and copied completely
2. Check if API key has been revoked in dashboard
3. Create a new API key if necessary
4. Ensure API key is for correct brand/organization

### Issue: "PAN number already exists"

**Cause**: PAN number is already registered in the system

**Solutions**:

1. Verify PAN number is correct
2. Use unique PAN for each application
3. Contact support if duplicate was created in error

### Issue: "Mobile number already exists for this brand"

**Cause**: Mobile number is already associated with another lead

**Solutions**:

1. Use a different mobile number
2. Contact support if duplicate needs to be resolved
3. Verify the mobile number belongs to the correct person

### Issue: "Lead not found" (404)

**Cause**: Invalid lead ID or lead has been deleted

**Solutions**:

1. Verify lead ID is correct (from create response)
2. Check if lead ID has correct format
3. Ensure lead was successfully created

### Issue: Rate Limit Exceeded (429)

**Cause**: Too many requests in a short time period

**Solutions**:

1. Implement exponential backoff in retry logic
2. Space out API requests
3. Contact support for rate limit increase
4. Use batch endpoints if available

### Issue: Validation Errors (400)

**Cause**: Invalid data format or missing required fields

**Solutions**:

1. Validate all required fields are provided
2. Check data types match requirements (e.g., email format)
3. Ensure PAN is 10 characters, mobile is 10 digits
4. Verify enum values (loan_type) are valid

### Issue: Server Error (500)

**Cause**: Unexpected server error

**Solutions**:

1. Retry request after a few seconds
2. Implement exponential backoff
3. Check system status page
4. Contact support with error timestamp and path

---

## FAQ

**Q: How do I get an API Key?**  
A: Go to Partner Dashboard → Settings → API Keys → Create New API Key

**Q: How often should I rotate API Keys?**  
A: It's recommended to rotate keys every 90 days for security

**Q: Can I use both API Key and Bearer Token?**  
A: Yes, either one works. Use whichever fits your use case better

**Q: What's the maximum loan amount?**  
A: There's no hard limit, but verify with your lender for business rules

**Q: How long does a lead take to process?**  
A: Processing time varies by lender, typically 1-3 business days

**Q: Can I update a lead after creation?**  
A: Currently, leads cannot be updated. Create a new lead if changes needed

**Q: Is there a rate limit?**  
A: Yes, standard is 1000 requests/hour. Contact support for higher limits

---

## Support & Resources

- **API Status**: https://status.loanwalle.com
- **Documentation**: https://docs.loanwalle.com
- **Support Email**: api-support@loanwalle.com
- **Support Chat**: Available in Partner Dashboard
- **Issue Tracker**: https://github.com/loanwalle/api-issues

---

## Version History

| Version | Date       | Changes             |
| ------- | ---------- | ------------------- |
| 1.0.0   | 2026-02-08 | Initial API release |

---

**Last Updated**: February 8, 2026  
**API Version**: 1.0.0  
**Documentation Version**: 1.0

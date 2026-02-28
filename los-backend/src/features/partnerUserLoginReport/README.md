# Partner User Login Report Service

This service provides comprehensive analytics for partner user login activities, including detailed session information, device tracking, and timing data in IST timezone.

## Features

- **Detailed Login Reports**: Get comprehensive login analytics with session details
- **Today's Login Report**: Quick access to current day's login activities
- **Summary Statistics**: Aggregated metrics for login activities
- **CSV Export**: Export reports for external analysis
- **Timezone Support**: All times displayed in IST (Asia/Kolkata)
- **Device Tracking**: Includes device type, OS, app version, and IP address
- **Flexible Filtering**: Filter by date range and user email

## API Endpoints

### 1. Get Partner User Login Report

```http
GET /partner-user-login-reports
```

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format  
- `userEmail` (optional): Filter by specific user email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userEmail": "user@example.com",
      "loginDate": "2025-08-06",
      "totalSessions": 3,
      "firstLoginIST": "09:30:15 AM",
      "lastLoginIST": "06:45:30 PM",
      "sessions": "Login: 09:30:15 AM | Logout: 12:30:00 PM | Device: mobile (iOS) | App: v1.2.3 | IP: 192.168.1.1\nLogin: 02:15:30 PM | Logout: 06:45:30 PM | Device: desktop (Windows) | App: v1.2.3 | IP: 192.168.1.1"
    }
  ],
  "meta": {
    "totalRecords": 1,
    "filters": {
      "startDate": "2025-08-01",
      "endDate": "2025-08-06"
    },
    "generatedAt": "2025-08-06T10:30:00.000Z"
  }
}
```

### 2. Get Today's Login Report

```http
GET /partner-user-login-reports/today
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "totalRecords": 5,
    "reportDate": "2025-08-06",
    "generatedAt": "2025-08-06T10:30:00.000Z"
  }
}
```

### 3. Get Login Summary Statistics

```http
GET /partner-user-login-reports/stats
```

**Query Parameters:** Same as main report endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 25,
    "totalSessions": 87,
    "uniqueLoginDates": 15,
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    }
  },
  "meta": {
    "filters": {},
    "generatedAt": "2025-08-06T10:30:00.000Z"
  }
}
```

### 4. Export as CSV

```http
GET /partner-user-login-reports/export/csv
```

**Query Parameters:** Same as main report endpoint

**Response:** CSV file download with headers:
- User Email
- Login Date  
- Total Sessions
- First Login (IST)
- Last Login (IST)
- Sessions

## Usage Examples

### Basic Report
```bash
curl "http://localhost:3000/partner-user-login-reports"
```

### Filtered by Date Range
```bash
curl "http://localhost:3000/partner-user-login-reports?startDate=2025-08-01&endDate=2025-08-06"
```

### Filtered by User Email
```bash
curl "http://localhost:3000/partner-user-login-reports?userEmail=user@example.com"
```

### Export CSV
```bash
curl -o "login-report.csv" "http://localhost:3000/partner-user-login-reports/export/csv?startDate=2025-08-01"
```

## Integration

### 1. Add to App Module

```typescript
import { PartnerUserLoginReportModule } from './features/partnerUserLoginReport';

@Module({
  imports: [
    // ... other modules
    PartnerUserLoginReportModule,
  ],
})
export class AppModule {}
```

### 2. Use Service Directly

```typescript
import { PartnerUserLoginReportService } from './features/partnerUserLoginReport';

@Injectable()
export class MyService {
  constructor(
    private readonly loginReportService: PartnerUserLoginReportService
  ) {}

  async getLoginData() {
    return await this.loginReportService.getPartnerUserLoginReport({
      startDate: '2025-08-01',
      endDate: '2025-08-06'
    });
  }
}
```

## Database Requirements

The service expects the following tables in your database:
- `partner_login_tokens` - Login session records
- `partner_users` - Partner user information
- `devices` - Device information (optional, left joined)

## Security Considerations

- Add authentication guards to protect endpoints
- Implement rate limiting for export endpoints
- Consider data retention policies for login logs
- Validate and sanitize query parameters

## Performance Notes

- The service uses raw SQL queries for optimal performance
- Large date ranges may impact performance
- Consider adding pagination for very large datasets
- Database indexes on `createdAt` and `partnerUserId` are recommended

## Error Handling

All endpoints return structured error responses:

```json
{
  "success": false,
  "message": "Failed to generate partner user login report",
  "error": "Detailed error message"
}
```

## Timezone Information

- All timestamps are converted to IST (Asia/Kolkata) timezone
- Database timestamps should be stored in UTC
- The service handles timezone conversion automatically

## Excluded Users

The following system accounts are automatically excluded from reports:
- super@8byte.ai
- ab@8byte.ai

To modify excluded users, update the `whereConditions` in the service methods.
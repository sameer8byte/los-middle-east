import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { ServiceRequestLogService } from "./service-request-log.service";

@Injectable()
export class ServiceRequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ServiceRequestLogInterceptor.name);

  constructor(
    private readonly serviceRequestLogService: ServiceRequestLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extract request information
    const { method, url, ip, headers, body, user, partnerUser, brand, device } =
      request;

    return next.handle().pipe(
      tap((responseData) => {
        const responseTime = Date.now() - startTime;

        // Log successful requests
        this.logRequest({
          method,
          url,
          ip,
          headers,
          body,
          user,
          partnerUser,
          brand,
          device,
          responseStatus: response.statusCode,
          responseTime,
          responseData,
          success: true,
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;

        // Log failed requests
        this.logRequest({
          method,
          url,
          ip,
          headers,
          body,
          user,
          partnerUser,
          brand,
          device,
          responseStatus: error.status || 500,
          responseTime,
          errorMessage: error.message,
          success: false,
        });

        throw error;
      }),
    );
  }

  private async logRequest(data: {
    method: string;
    url: string;
    ip: string;
    headers: any;
    body: any;
    user?: any;
    partnerUser?: any;
    brand?: any;
    device?: any;
    responseStatus: number;
    responseTime: number;
    responseData?: any;
    errorMessage?: string;
    success: boolean;
  }) {
    try {
      await this.serviceRequestLogService.create({
        userId: data.user?.id,
        partnerUserId: data.partnerUser?.id,
        brandId:
          data.brand?.id || data.user?.brandId || data.partnerUser?.brandId,
        action: this.getActionFromUrl(data.url),
        method: data.method,
        url: data.url,
        ipAddress: data.ip,
        userAgent: data.headers["user-agent"],
        requestHeaders: this.sanitizeHeaders(data.headers),
        requestBody: this.sanitizeRequestBody(data.body),
        responseStatus: data.responseStatus,
        responseTime: data.responseTime,
        errorMessage: data.errorMessage,
        success: data.success,
        metadata: {
          deviceId: data.device?.id,
          platform: data.device?.platformType,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Failed to log service request", {
        error: error.message,
        url: data.url,
        method: data.method,
      });
    }
  }

  private getActionFromUrl(url: string): string {
    // Extract meaningful action from URL
    const segments = url.split("/").filter(Boolean);

    if (segments.length === 0) return "root";

    // Remove query parameters
    const lastSegment = segments[segments.length - 1].split("?")[0];

    // Common patterns
    const patterns = [
      { pattern: /login/, action: "login" },
      { pattern: /logout/, action: "logout" },
      { pattern: /register/, action: "register" },
      { pattern: /verify/, action: "verify" },
      { pattern: /reset/, action: "reset" },
      { pattern: /refresh/, action: "refresh_token" },
      { pattern: /profile/, action: "profile" },
      { pattern: /dashboard/, action: "dashboard" },
      { pattern: /transaction/, action: "transaction" },
      { pattern: /payment/, action: "payment" },
      { pattern: /kyc/, action: "kyc" },
      { pattern: /upload/, action: "upload" },
      { pattern: /download/, action: "download" },
    ];

    for (const { pattern, action } of patterns) {
      if (pattern.test(url.toLowerCase())) {
        return action;
      }
    }

    // Default to the last meaningful segment
    return lastSegment || "unknown";
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};

    const sensitiveHeaders = [
      "authorization",
      "cookie",
      "set-cookie",
      "x-api-key",
      "x-auth-token",
      "x-session-token",
    ];

    const sanitized = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = "[REDACTED]";
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;

    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "otp",
      "pin",
      "ssn",
      "credit_card",
      "card_number",
      "cvv",
      "api_key",
      "private_key",
    ];

    const sanitized = JSON.parse(JSON.stringify(body));

    const sanitizeObject = (obj: any) => {
      if (typeof obj !== "object" || obj === null) return;

      Object.keys(obj).forEach((key) => {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          obj[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}

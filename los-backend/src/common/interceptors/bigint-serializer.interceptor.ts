// src/common/interceptors/bigint-serializer.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import JSONBig from 'json-bigint';

const serializer = JSONBig({ useNativeBigInt: true, alwaysParseAsBig: false });

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const http = context.switchToHttp();
        const response = http.getResponse();

        // ✅ Check if the response is already being handled (e.g. CSV, file download)
        // or if the content-type has been explicitly set to something other than JSON
        const contentType = response.getHeader('Content-Type') || '';

        if (response.headersSent || response.writableEnded) {
          return; // Already handled upstream, do nothing
        }

        if (contentType && !contentType.toString().includes('application/json')) {
          return data; // Let NestJS handle non-JSON responses normally
        }

        // ✅ Only apply BigInt JSON serialization for JSON responses
        const json = serializer.stringify(data);
        response.setHeader('Content-Type', 'application/json');
        response.end(json);

        return; // Prevent NestJS from double-serializing
      })
    );
  }
}
// src/common/filters/prisma-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 400;
    let message = "Bad request";

    switch (exception.code) {
      case "P2002":
        message =
          "Unique constraint failed on the field(s): " + exception.meta?.target;
        break;
      case "P2003":
        message =
          "Foreign key constraint failed on the field(s): " +
          exception.meta?.field_name;
        break;
      case "P2025":
        status = 404;
        message = "Record not found";
        break;
      default:
        status = 500;
        message = "Internal server error";
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.message,
    });
  }
}

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { AppModule } from "./app.module";
import helmet from "helmet";
import compression from "compression";
import { PrismaService } from "./src/prisma/prisma.service";
import { HttpExceptionFilter } from "src/common/filters/http-exception.filter";
import { LoggingInterceptor } from "src/common/interceptors/logging.interceptor";
import * as cookieParser from "cookie-parser";
import { PrismaExceptionFilter } from "src/common/filters/prisma-exception.filter";
import { json, urlencoded } from "express";
import { BigIntSerializerInterceptor } from "src/common/interceptors/bigint-serializer.interceptor";

async function bootstrap() {
  const isCronWorker = process.env.CRON_WORKER === "true";

  if (isCronWorker) {
    // ✅ Cron Worker Mode - No HTTP Server
    const app = await NestFactory.createApplicationContext(AppModule);
    process.on("SIGTERM", async () => {
      console.log("⚠️ SIGTERM received, shutting down gracefully");
      await app.close();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("⚠️ SIGINT received, shutting down gracefully");
      await app.close();
      process.exit(0);
    });
  } else {
    // ✅ API Server Mode - With HTTP Server
    const app = await NestFactory.create(AppModule);

    // Security middlewares
    app.use(helmet());
    app.use(compression());
    app.use(cookieParser.default());

    // For JSON and form body size limits
    app.use(json({ limit: "50mb" }));
    app.use(urlencoded({ extended: true, limit: "50mb" }));
    app.enableCors({
      origin: [
        // Localhost for development
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "https://crm.8byte.ai",

        // Qualoan
        "https://web.qualoan.com",
        "https://web1.qualoan.com",
        "https://app.qualoan.com",
        "https://gocredit.qualoan.com",
        "https://lm.qualoan.com",

        // PaisaPop
        "https://crm.paisapop.com",
        "https://offers.paisapop.com",
        "https://paisapop.com",
        "https://web.paisapop.com",
        "https://web1.paisapop.com",
        "https://web2.paisapop.com",
        "https://bs.paisapop.com",

        // Minutes Loan
        "https://minutesloan.com",
        "https://crm.minutesloan.com",
        "https://web.minutesloan.com",
        "https://app.minutesloan.com",
        "https://web1.minutesloan.com",

        // UAT Environments
        "https://uat.crm.paisapop.com",
        "https://uat.web.paisapop.com",

        // Zepto Finance
        "https://qualoan.com",
        "https://paisapop.com",

        // Qualoan UAT
        "https://uat.lm.qualoan.com",
        "https://uat.web.qualoan.com",

        // Zepto Finance UAT
        "https://crm.zeptofinance.com",
        "https://web1.zeptofinance.com",
        "https://app.zeptofinance.com",

        // Salary4Sure UAT
        "https://app.salary4sure.com",
        "https://web.salary4sure.com",
        "https://web1.salary4sure.com",
        "https://web2.salary4sure.com",
        "https://web3.salary4sure.com",
        "https://crm.salary4sure.com",
        "https://loans.salary4sure.com",
        "https://lm.salary4sure.com",
        "https://bs.salary4sure.com",

        // fastsalary.com
        "https://fastsalary.com",
        "https://web.fastsalary.com",
        "https://crm.fastsalary.com",
        "https://app.fastsalary.com",

        // UAT
        "https://partner.8byte.ai",
        "https://uat.8byte.ai",

        // salarybolt.com
        "https://salarybolt.com",
        "https://web.salarybolt.com",
        "https://crm.salarybolt.com",
        "https://app.salarybolt.com",

        // salarybaba.com
        "https://salarybaba.com",
        "https://web.salarybaba.com",
        "https://crm.salarybaba.com",
        "https://app.salarybaba.com",

        // jhatpatcash
        "https://jhatpatcash.com",
        "https://app.jhatpatcash.com",
        "https://lm.jhatpatcash.com",

        //crednidhi
        "https://crednidhi.com",
        "https://web.crednidhi.com",
        "https://app.crednidhi.com",
        "https://lm.crednidhi.com",
        "https://crm.crednidhi.com",
      ],
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Global prefix for API routes
    app.setGlobalPrefix("api");

    // API Versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });

    // Interceptors (order matters)
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new BigIntSerializerInterceptor(),
    );

    // Filters (last one has highest priority)
    app.useGlobalFilters(
      new PrismaExceptionFilter(),
      new HttpExceptionFilter(),
    );

    // Enable shutdown hooks for Prisma
    const prismaService = app.get(PrismaService);
    await prismaService.enableShutdownHooks(app);

    // Start server
    const port = process.env.PORT || 4002;
    try {
      await app.listen(port, "0.0.0.0");
      console.log(`🚀 API Server is running on: ${await app.getUrl()}`);
      console.log(
        `📊 Cluster mode: ${process.env.NODE_APP_INSTANCE !== undefined ? "Worker #" + process.env.NODE_APP_INSTANCE : "Single instance"}`,
      );
    } catch (error: any) {
      if (error.code === "EADDRINUSE") {
        console.error(
          `❌ Port ${port} is already in use. Process exiting gracefully.`,
        );
        process.exit(1);
      }
      throw error;
    }
  }
}

// ✅ Proper async error handling wrapper
(async function initializeApp() {
  try {
    await bootstrap();
  } catch (error: any) {
    console.error("❌ Failed to bootstrap application:", error);
    process.exit(1);
  }
})();

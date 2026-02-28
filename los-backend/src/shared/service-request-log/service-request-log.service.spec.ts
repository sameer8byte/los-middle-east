import { Test, TestingModule } from "@nestjs/testing";
import { ServiceRequestLogService } from "./service-request-log.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("ServiceRequestLogService", () => {
  let service: ServiceRequestLogService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestLogService,
        {
          provide: PrismaService,
          useValue: {
            serviceRequestLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ServiceRequestLogService>(ServiceRequestLogService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should create a service request log", async () => {
    const logData = {
      action: "TestController.testMethod",
      method: "POST",
      url: "/test",
      userId: "test-user-id",
      success: true,
    };

    const mockLog = {
      id: "log-id",
      ...logData,
      partnerUserId: null,
      brandId: null,
      ipAddress: null,
      userAgent: null,
      requestHeaders: null,
      requestBody: null,
      responseStatus: null,
      responseTime: null,
      errorMessage: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    jest
      .spyOn(prisma.serviceRequestLog, "create")
      .mockResolvedValue(mockLog as any);

    const result = await service.create(logData);

    expect(prisma.serviceRequestLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining(logData),
    });
    expect(result).toEqual(mockLog);
  });

  it("should handle errors gracefully when creating logs", async () => {
    const logData = {
      action: "TestController.testMethod",
      method: "POST",
      url: "/test",
    };

    jest
      .spyOn(prisma.serviceRequestLog, "create")
      .mockRejectedValue(new Error("Database error"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.create(logData);

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to create service request log:",
      expect.any(Error),
    );
  });

  it("should find logs with filters", async () => {
    const mockLogs = [
      {
        id: "log-1",
        userId: "test-user",
        partnerUserId: null,
        brandId: null,
        action: "test",
        method: "GET",
        url: "/test",
        ipAddress: null,
        userAgent: null,
        requestHeaders: null,
        requestBody: null,
        responseStatus: 200,
        responseTime: 100,
        errorMessage: null,
        success: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "log-2",
        userId: "test-user",
        partnerUserId: null,
        brandId: null,
        action: "test2",
        method: "POST",
        url: "/test2",
        ipAddress: null,
        userAgent: null,
        requestHeaders: null,
        requestBody: null,
        responseStatus: 500,
        responseTime: 200,
        errorMessage: "Error",
        success: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    jest
      .spyOn(prisma.serviceRequestLog, "findMany")
      .mockResolvedValue(mockLogs as any);

    const result = await service.findMany({
      userId: "test-user",
      success: true,
      take: 10,
    });

    expect(prisma.serviceRequestLog.findMany).toHaveBeenCalledWith({
      where: {
        userId: "test-user",
        success: true,
        partnerUserId: undefined,
        brandId: undefined,
        action: undefined,
        method: undefined,
      },
      take: 10,
      skip: undefined,
      orderBy: { createdAt: "desc" },
      include: expect.any(Object),
    });
    expect(result).toEqual(mockLogs);
  });

  it("should get statistics", async () => {
    jest
      .spyOn(prisma.serviceRequestLog, "count")
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(85) // successful
      .mockResolvedValueOnce(15); // failed

    const result = await service.getStats({
      userId: "test-user",
    });

    expect(result).toEqual({
      total: 100,
      successful: 85,
      failed: 15,
      successRate: 85,
    });
  });
});

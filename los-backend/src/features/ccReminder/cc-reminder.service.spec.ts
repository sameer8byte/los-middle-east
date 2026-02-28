import { Test, TestingModule } from '@nestjs/testing';
import { CcReminderService } from './cc-reminder.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/core/communication/services/email.service';

describe('CcReminderService', () => {
  let service: CcReminderService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CcReminderService,
        {
          provide: PrismaService,
          useValue: {
            $queryRawUnsafe: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CcReminderService>(CcReminderService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLoginReport', () => {
    it('should return login report data', async () => {
      const mockData = [
        {
          userEmail: 'test@example.com',
          loginDate: '2024-01-15',
          totalSessions: BigInt(2),
          firstLoginIST: '09:00:00 AM',
          lastLoginIST: '05:00:00 PM',
          sessions: 'Login: 09:00:00 AM | Logout: 10:00:00 AM | Device: mobile (iOS) | App: 1.0.0 | IP: 192.168.1.1',
        },
      ];

      jest.spyOn(prismaService, '$queryRawUnsafe').mockResolvedValue(mockData);

      const result = await service.getLoginReport();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].totalSessions).toBe(2); // Should be converted from BigInt
      expect(result[0].userEmail).toBe('test@example.com');
    });

    it('should handle query parameters correctly', async () => {
      jest.spyOn(prismaService, '$queryRawUnsafe').mockResolvedValue([]);

      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        userEmail: 'test@example.com',
      };

      await service.getLoginReport(query);
      
      expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("pu.email = 'test@example.com'"),
      );
    });
  });

  describe('sendCcReminderEmail', () => {
    it('should send email successfully', async () => {
      const mockReportData = [
        {
          userEmail: 'test@example.com',
          loginDate: '2024-01-15',
          totalSessions: 2,
          firstLoginIST: '09:00:00 AM',
          lastLoginIST: '05:00:00 PM',
          sessions: 'Sample session data',
        },
      ];

      jest.spyOn(service, 'getLoginReport').mockResolvedValue(mockReportData);
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(true);

      const result = await service.sendCcReminderEmail(['test@example.com']);

      expect(result.success).toBe(true);
      expect(result.reportData).toEqual(mockReportData);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          name: 'CC Reminder Report',
          subject: expect.stringContaining('Partner Login Report'),
        }),
      );
    });

    it('should handle email sending failure', async () => {
      jest.spyOn(service, 'getLoginReport').mockResolvedValue([]);
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(false);

      const result = await service.sendCcReminderEmail(['test@example.com']);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send email');
    });
  });
});

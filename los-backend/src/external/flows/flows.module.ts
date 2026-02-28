import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FlowsController } from './flows.controller';
import { FlowsService } from './service/flows.service';
import { EncryptionService } from './service/encryption.service';
import { InitialDetailsService } from './service/initial-details.service';
import { BankAccountService } from './service/bank-account.service';
import { WebhookService } from './service/webhook.service';
import { LoanApplicationService } from './service/loan-application.service';
import { WhatsAppTemplateService } from './service/whatsapp-template.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpVerificationModule } from '../../shared/otpVerification/otp-verification.module';
import { AwsPublicS3Service } from '../../core/aws/s3/aws-public-s3.service';
import { AwsAuditLogsSqsService } from '../../core/aws/sqs/aws-audit-logs-sqs.service';
import { DigiLocker20Module } from '../digiLocker2.0/digiLocker2.0.modules';
import { PanDetailsPlusModule } from '../panDetailsPlus/panDetailsPlus.modules';
import { PennyDropModule } from '../pennyDrop/pennyDrop.modules';
import { AAModule } from '../aa/aa.module';
import { GeoCodingModule } from '../geocoding/geocoding.module';
import { CommunicationModule } from '../../core/communication/communication.module';
// import { EsignModule } from '../../features/esign/esign.module';
// import { EsignWhatsAppService } from './service/esign-whatsapp.service';
import { RedisModule } from '../../core/redis/redis.module';

@Module({
  imports: [
    HttpModule,
    OtpVerificationModule,
    CommunicationModule,
    // EsignModule,
    RedisModule,
    DigiLocker20Module.register({
      signzy: {
        baseUrl: process.env.SIGNZY_DIGILOCKER_BASE_URL,
        accessToken: process.env.SIGNZY_DIGILOCKER_ACCESS_TOKEN,
      },
      digitap: {
        baseUrl: process.env.DIGITAP_DIGILOCKER_BASE_URL,
        authKey: process.env.DIGITAP_DIGILOCKER_AUTH_KEY,
      },
    }),
    PanDetailsPlusModule.register({
      digitap: {
        baseUrl: process.env.DIGITAP_BASE_URL,
        authKey: process.env.DIGITAP_AUTH_KEY,
      },
      scoreMe: {
        baseUrl: process.env.SCOREME_BASE_URL,
        clientId: process.env.SCOREME_CLIENT_ID,
        clientSecret: process.env.SCOREME_CLIENT_SECRET,
      },
    }),
    PennyDropModule,
    AAModule,
    GeoCodingModule.register({
      baseUrl: 'https://maps.googleapis.com/maps/api',
      apiKey: process.env.GOOGLE_GEOLOCATION_API_KEY || '',
    }),
  ],
  controllers: [FlowsController],
  providers: [
    FlowsService,
    EncryptionService,
    InitialDetailsService,
    BankAccountService,
    WebhookService,
    LoanApplicationService,
    WhatsAppTemplateService,
    // EsignWhatsAppService,
    AwsPublicS3Service,
    AwsAuditLogsSqsService,
    PrismaService,
  ],
  // exports: [EsignWhatsAppService],
})
export class FlowsModule {}
// src/communication/communication.module.ts
import { Module } from "@nestjs/common";
import { EmailService } from "./services/email.service";
import { SmsService } from "./services/sms.service";
import { WhatsAppService } from "./services/whatsapp.service";
import { EmailProvider } from "./interfaces/email-provider.interface";
import { SmsProvider } from "./interfaces/sms-provider.interface";
import { WhatsAppProvider } from "./interfaces/whatsapp-provider.interface";
import { SmsGatewayHubSmsProvider } from "./providers/sms/smsgatewayhub.provicer";
import { HttpModule } from "@nestjs/axios";
import { Msg91SmsProvider } from "./providers/sms/msg91.provider";
import { ZeptoEmailProvider } from "./providers/email/zepto-email.provider";
import { BrevoEmailProvider } from "./providers/email/brevo-email.provider";
import { NimbusitSmsProvider } from "./providers/sms/nimbusit-sms.provider";
import { AisensyProvider } from "./providers/whatsapp/aisensey.provider";
import { EmailConfigService } from "./services/email-config.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000, // 7 seconds timeout
      maxRedirects: 5,
    }),
  ],
  providers: [
    EmailConfigService,
    ZeptoEmailProvider,
    BrevoEmailProvider,
    Msg91SmsProvider,
    SmsGatewayHubSmsProvider,
    NimbusitSmsProvider,
    AisensyProvider,
    {
      provide: "EMAIL_PROVIDERS",
      useFactory: (zepto: ZeptoEmailProvider, brevo: BrevoEmailProvider) => {
        return [zepto, brevo];
      },
      inject: [ZeptoEmailProvider, BrevoEmailProvider],
    },

    {
      provide: "SMS_PROVIDERS",
      useFactory: (
        msg91: Msg91SmsProvider,
        smsGatewayHub: SmsGatewayHubSmsProvider,
        nimbusit: NimbusitSmsProvider,
      ) => {
        // Define priority order here
        return [msg91, smsGatewayHub, nimbusit];
      },
      inject: [Msg91SmsProvider, SmsGatewayHubSmsProvider, NimbusitSmsProvider],
    },
    {
      provide: "WHATSAPP_PROVIDERS",
      useFactory: (aisensy: AisensyProvider) => {
        // Filter configured providers only
        const providers: WhatsAppProvider[] = [];

        // Only add if configured
        if (aisensy?.name) {
          providers.push(aisensy);
        }

        return providers;
      },
      inject: [AisensyProvider],
    },
    {
      provide: EmailService,
      useFactory: (providers: EmailProvider[]) => {
        return new EmailService(providers);
      },
      inject: ["EMAIL_PROVIDERS"],
    },
    {
      provide: SmsService,
      useFactory: (providers: SmsProvider[]) => {
        return new SmsService(providers);
      },
      inject: ["SMS_PROVIDERS"],
    },
    {
      provide: WhatsAppService,
      useFactory: (providers: WhatsAppProvider[]) => {
        return new WhatsAppService(providers);
      },
      inject: ["WHATSAPP_PROVIDERS"],
    },
  ],
  exports: [EmailService, SmsService, WhatsAppService],
})
export class CommunicationModule {}

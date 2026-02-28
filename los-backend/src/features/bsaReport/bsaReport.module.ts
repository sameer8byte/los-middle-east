import { Module } from "@nestjs/common";
import { ScoreMeModule } from "src/external/scoreme/scoreme.module";
import { BsaReportService } from "./bsaReport.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { ScoreMeProvider } from "./provider/scoreMe.provider";
import { BsaReportInterface } from "./interface/bsa-provider.interface";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { CardModule } from "src/external/cart/cart.module";
import { CardProvider } from "./provider/card.provider";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  imports: [
    PrismaModule,
    ScoreMeModule.register({
      baseUrl: process.env.SCOREME_BASE_URL,
      clientId: process.env.SCOREME_CLIENT_ID,
      clientSecret: process.env.SCOREME_CLIENT_SECRET,
    }),
    CardModule.register({
      baseUrl: process.env.CART_BASE_URL,
      authToken: process.env.CART_AUTH_TOKEN,
    }),
  ],
  providers: [
    ScoreMeProvider,
    CardProvider,
    BsaReportService,
    AwsPublicS3Service,
    {
      provide: "BSA_PROVIDERS",
      useFactory: (card: CardProvider, scoreMe: ScoreMeProvider) => {
        // Define priority order here
        return [card, scoreMe];
      },
      inject: [CardProvider, ScoreMeProvider],
    },
    {
      provide: BsaReportService,
      useFactory: (providers: BsaReportInterface[], prisma: PrismaService) => {
        return new BsaReportService(providers, prisma);
      },
      inject: ["BSA_PROVIDERS", PrismaService],
    },
  ],
  exports: [BsaReportService], // in case you want to use it in other modules
})
export class BasReportModule {}

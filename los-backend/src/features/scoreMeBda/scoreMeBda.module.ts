import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ScoreMeBdaController } from "./scoreMeBda.controller";
import { ScoreMeBdaService } from "./scoreMeBda.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 100000,
      maxRedirects: 5,
    }),
    PrismaModule,
  ],
  controllers: [ScoreMeBdaController],
  providers: [ScoreMeBdaService, AwsPublicS3Service],
  exports: [ScoreMeBdaService],
})
export class ScoreMeBdaModule {}

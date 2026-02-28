import { Module } from "@nestjs/common";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { WebPersonalDetailsService } from "./web.personal-details.service";
import { WebPersonalDetailsController } from "./web.personal-details.controller";
import { AlternateAddressModule } from "src/shared/alternate-address/alternate-address.module";
import { AlternatePhoneNumberModule } from "src/shared/alternate-phone-number/alternate-phone-number.module";
import { UserDetailsModule } from "src/shared/user-details/user-details.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";

@Module({
  imports: [
    UserLogsModule,
    UserDetailsModule,
    AlternateAddressModule,
    AlternatePhoneNumberModule,
  ],
  controllers: [WebPersonalDetailsController],
  providers: [WebPersonalDetailsService, AwsPublicS3Service],
  exports: [WebPersonalDetailsService], // in case you want to use it in other modules
})
export class WebPersonalDetailsModules {}

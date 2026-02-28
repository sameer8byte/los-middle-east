import { Module } from "@nestjs/common";
import { WebKycModule } from "./kyc/web.kyc.module";
import { WebBankModule } from "./bank/web.bank.module";
import { WebEmploymentModule } from "./employment/web.employment.module";
import { WebIndexModule } from "./home/web.index.modules";
import { WebPersonalDetailsModules } from "./personal-details/web.personal-details.module";
import { WebBlogsModule } from "./blogs/web.blogs.module";

@Module({
  imports: [
    WebKycModule,
    WebEmploymentModule,
    WebEmploymentModule,
    WebBankModule,
    WebIndexModule,
    WebPersonalDetailsModules,
    WebBlogsModule,
  ],
})
export class WebModule {}

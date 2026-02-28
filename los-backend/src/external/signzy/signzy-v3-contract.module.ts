import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SignzyV3ContractService } from './services/v3Contract.services';
import { SignzyV3Config } from './interface/v3Contract.interface';
import { PdfModule } from 'src/core/pdf/pdf.module';
@Module({})
export class SignzyV3ContractModule {
  static register(config: SignzyV3Config): DynamicModule {
    return {
      module: SignzyV3ContractModule,
      controllers: [],
      imports: [
        HttpModule.register({
          timeout: 30000,
          maxRedirects: 5,
        }),
        PdfModule,
      ],
      providers: [
        {
          provide: 'SIGNZY_V3_CONFIG',
          useValue: config,
        },
        SignzyV3ContractService,
      ],
      exports: [SignzyV3ContractService],
    };
  }
}

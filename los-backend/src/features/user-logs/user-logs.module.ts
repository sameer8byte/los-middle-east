import { Module } from '@nestjs/common';
import { UserLogsService } from './user-logs.service';
import { UserLogsController } from './user-logs.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
 
@Module({
  imports: [PrismaModule],
  controllers: [UserLogsController],
  providers: [UserLogsService],
  exports: [UserLogsService],
})
export class UserLogsModule {}

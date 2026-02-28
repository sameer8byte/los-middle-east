import { Module } from "@nestjs/common";
import { UserRemindersController } from "./user-reminders.controller";
import { UserRemindersService } from "./user-reminders.service";
import { PrismaModule } from "src/prisma/prisma.module";


@Module({
    imports: [PrismaModule],
    controllers: [UserRemindersController],
    providers: [UserRemindersService]
})

export class UserRemindersModule {}
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { GetLeadDataDto } from './dto/get-lead-data.dto';
import { AuthType } from 'src/common/decorators/auth.decorator';
import { RequireRoleOrPermission } from 'src/common/decorators/role-permission.decorator';
import { RolePermissionGuard } from 'src/common/guards/role-permission.guard';

@Controller('TaskApi')
//@UseGuards(RolePermissionGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @AuthType('public')
  @Post('getLeadDataFromPancard')
  @HttpCode(HttpStatus.OK)
  async getLeadDataFromPancard(
    @Body() dto: GetLeadDataDto,
  ) {
    return this.taskService.getLeadDataFromPancard(dto.pancard);
  }
}
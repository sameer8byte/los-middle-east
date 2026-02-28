import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationTargetDto } from './dto/notification-target.dto';
import { AuthType } from 'src/common/decorators/auth.decorator';
import { NotificationQueryDto } from 'src/features/notification/dto/notification-query.dto';
import { notification_priority_enum } from '@prisma/client';


@Controller('notifications')
@AuthType('partner')

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  findAll(
    @Query('partnerUserId') partnerUserId?: string,
    @Query('loanId') loanId?: string,
    @Query('userId') userId?: string,
    @Query('partnerRoleId', ParseIntPipe) partnerRoleId?: number,
    @Query('priority') priority?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const filterBy = { partnerUserId, loanId, userId, partnerRoleId, priority };
    return this.notificationService.findAll(skip, limit, filterBy);
  }

  @Get('partner/:partnerUserId')
  getNotificationsForPartnerUser(
    @Param('partnerUserId') partnerUserId: string,
  ) {
    return this.notificationService.getNotificationsForPartnerUser(partnerUserId);
  }

 // Controller
 @Get('partner-user/:partnerUserId')
 getNotificationsForPartnerUserWithPagination(
   @Param('partnerUserId') partnerUserId: string,
   @Query() query: NotificationQueryDto,
 ) {
   const { page = 1, limit = 10, priority, readStatus, acknowledgedStatus, dateRange } = query;
   const skip = (page - 1) * limit;
 
 
   return this.notificationService.getNotificationsForPartnerUserWithPagination(
     partnerUserId,
     skip,
     limit,
     { priority, readStatus, acknowledgedStatus, dateRange },
   );
 }
 

  @Get('partner/:partnerUserId/unread-count')
  getUnreadCount(
    @Param('partnerUserId') partnerUserId: string,
  ) {
    return this.notificationService.getUnreadCount(partnerUserId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }

  @Patch('targets/:targetId/mark-read')
  markAsRead(@Param('targetId') targetId: string) {
    return this.notificationService.markAsRead(targetId);
  }

  @Patch('targets/:targetId/mark-unread')
  markAsUnread(@Param('targetId') targetId: string) {
    return this.notificationService.markAsUnread(targetId);
  }

  @Post(':id/targets')
  addTarget(
    @Param('id') notificationId: string,
    @Body() targetDto: NotificationTargetDto,
  ) {
    return this.notificationService.addTarget(notificationId, targetDto);
  }

  @Delete('targets/:targetId')
  removeTarget(@Param('targetId') targetId: string) {
    return this.notificationService.removeTarget(targetId);
  }

  @Patch(':id/acknowledge')
  markAsAcknowledged(@Param('id') id: string) {
    return this.notificationService.markAsAcknowledged(id);
  }

  @Get('scheduled')
  getScheduledNotifications() {
    return this.notificationService.getScheduledNotifications();
  }

  @Patch(':id/mark-sent')
  markAsSent(@Param('id') id: string) {
    return this.notificationService.markAsSent(id);
  }

  @Get('priority/:priority')
  getNotificationsByPriority(@Param('priority') priority: notification_priority_enum) {
    return this.notificationService.getNotificationsByPriority(priority);
  }

  @Patch('targets/:targetId/mark-read')
  markTargetAsRead(@Param('targetId') targetId: string) {
    return this.notificationService.markTargetAsRead(targetId);
  }

  @Patch('targets/:targetId/mark-acknowledged')
  markTargetAsAcknowledged(@Param('targetId') targetId: string) {
    return this.notificationService.markTargetAsAcknowledged(targetId);
  }

  @Patch('partner/:partnerUserId/mark-all-read')
  markAllAsReadForUser(@Param('partnerUserId') partnerUserId: string) {
    return this.notificationService.markAllAsReadForUser(partnerUserId);
  }

  @Patch('partner/:partnerUserId/mark-all-acknowledged')
  markAllAsAcknowledgedForUser(@Param('partnerUserId') partnerUserId: string) {
    return this.notificationService.markAllAsAcknowledgedForUser(partnerUserId);
  }
}

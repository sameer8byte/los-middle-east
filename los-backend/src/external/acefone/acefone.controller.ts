import { 
  Controller, 
  Post, 
  Get, 
  Patch,
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards, 
  BadRequestException,
  ParseIntPipe 
} from '@nestjs/common';
import { 
  AcefoneService, 
  ClickToDialRequest, 
  ClickToDialResponse,
  CreateUserRequest,
  UserResponse,
  FetchUserResponse,
  BroadcastLeadRequest,
  BroadcastLeadResponse,
} from './acefone.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('acefone')
@UseGuards(AuthGuard)
export class AcefoneController {
  constructor(private readonly acefoneService: AcefoneService) {}

  // ============================================================================
  // CLICK-TO-DIAL ENDPOINTS
  // ============================================================================

  @Post('click-to-dial')
  async clickToDial(
    @Body() payload: ClickToDialRequest & { leadId?: string },
  ): Promise<ClickToDialResponse> {
    if (!payload.destination_number || !payload.agent_number) {
      throw new BadRequestException(
        'destination_number and agent_number are required',
      );
    }

    return this.acefoneService.initiateClickToDial(
      payload.destination_number,
      payload.agent_number,
      payload.leadId,
    );
  }

  @Post('broadcast-lead/:leadId')
  async createBroadcastLead(
    @Param('leadId') leadId: string,
    @Body() payload: BroadcastLeadRequest,
  ): Promise<BroadcastLeadResponse> {
    return this.acefoneService.createBroadcastLead(leadId, payload);
  }

  // ============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================================================

  @Post('user')
  async createUser(@Body() createUserRequest: CreateUserRequest): Promise<UserResponse> {
    return this.acefoneService.createUser(createUserRequest);
  }

  @Get('user/:userId')
  async fetchSingleUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<FetchUserResponse> {
    return this.acefoneService.fetchSingleUser(userId);
  }

  @Get('user')
  async fetchMultipleUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<UserResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
      throw new BadRequestException('limit and offset must be valid numbers');
    }

    return this.acefoneService.fetchMultipleUsers(parsedLimit, parsedOffset);
  }

  @Patch('user/:userId')
  async updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateData: Partial<CreateUserRequest>,
  ): Promise<UserResponse> {
    return this.acefoneService.updateUser(userId, updateData);
  }

  @Delete('user/:userId')
  async deleteUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UserResponse> {
    return this.acefoneService.deleteUser(userId);
  }
}

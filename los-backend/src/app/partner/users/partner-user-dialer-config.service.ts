import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface DialerConfig {
  id: string;
  partner_user_id: string;
  agent_user_id: string;
  agent_user_number: string;
  agent_user_email: string;
  agent_allowed_caller_id?: string;
  is_disabled: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PartnerUserDialerConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async createDialerConfig(
    partnerUserId: string,
    agentUserId: string,
    agentUserNumber: string,
    agentUserEmail: string,
    agentAllowedCallerId?: string,
    agentSkillId?: string,
  ) {
    const data: any = {
      partner_user_id: partnerUserId,
      agent_user_id: agentUserId,
      agent_user_number: agentUserNumber,
      is_disabled: false,
    };

    if (agentUserEmail) {
      data.agent_user_email = agentUserEmail;
    }

    if (agentAllowedCallerId) {
      data.agent_allowed_caller_id = agentAllowedCallerId;
    }
    
     if (agentSkillId) {
    data.agent_skill_id = agentSkillId;
  }

    return this.prisma.partner_user_dialer_configs.create({ data });
  }

  async getDialerConfig(partnerUserId: string) {
    return this.prisma.partner_user_dialer_configs.findUnique({
      where: { partner_user_id: partnerUserId },
    });
  }

  async updateDialerConfig(
    partnerUserId: string,
    data: Partial<Omit<DialerConfig, 'id' | 'created_at' | 'updated_at'>>,
  ) {
    return this.prisma.partner_user_dialer_configs.update({
      where: { partner_user_id: partnerUserId },
      data,
    });
  }

  async deleteDialerConfig(partnerUserId: string) {
    return this.updateDialerConfig(partnerUserId, { is_disabled: true });
  }

  async getAllDialerConfigs(skip: number = 0, take: number = 10) {
    return this.prisma.partner_user_dialer_configs.findMany({
      skip,
      take,
    });
  }

  async enableDialer(partnerUserId: string) {
    return this.updateDialerConfig(partnerUserId, { is_disabled: false });
  }

  async disableDialer(partnerUserId: string) {
    return this.updateDialerConfig(partnerUserId, { is_disabled: true });
  }
}

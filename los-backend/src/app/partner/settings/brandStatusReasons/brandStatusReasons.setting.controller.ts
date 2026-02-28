import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GetPartnerUser } from 'src/common/decorators/get-user.decorator';
import { AuthenticatedPartnerUser } from 'src/common/types/partner-user.types';
import { CreateBrandStatusReasonDto } from './dto/create-brand-status-reason.dto';
import { UpdateBrandStatusReasonDto } from './dto/update-brand-status-reason.dto';
import { BrandStatusReasonsService } from './brandStatusReasons.setting.service';
import { AuthType } from 'src/common/decorators/auth.decorator';

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand-rejection-reasons")
export class BrandStatusReasonsController {
  constructor(private readonly service: BrandStatusReasonsService) {}

  @Post()
  create(
    @Param('brandId') brandId: string,
    @Body() dto: CreateBrandStatusReasonDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.service.create({ ...dto, brandId }, partnerUser.id);
  }

  @Get()
  findAll(@Param('brandId') brandId: string) {
    return this.service.findAllByBrand(brandId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandStatusReasonDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.service.update(id, dto, partnerUser.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.service.remove(id, partnerUser.id);
  }
}

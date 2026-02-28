import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandStatusReasonDto } from './create-brand-status-reason.dto';

export class UpdateBrandStatusReasonDto extends PartialType(CreateBrandStatusReasonDto) {}

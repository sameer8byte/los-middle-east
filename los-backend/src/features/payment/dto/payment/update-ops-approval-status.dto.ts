import { OpsApprovalStatusEnum } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateOpsApprovalStatusDto {
  @IsString()
  @IsNotEmpty()
  paymentRequestId: string;

  @IsString()
  @IsOptional()
  paymentCollectionTransactionId?: string;

  @IsString()
  @IsOptional()
  paymentPartialCollectionTransactionId?: string;

  @IsEnum(OpsApprovalStatusEnum)
  @IsOptional()
  opsApprovalStatus?: OpsApprovalStatusEnum = OpsApprovalStatusEnum.APPROVED;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  closingType?: string;
}

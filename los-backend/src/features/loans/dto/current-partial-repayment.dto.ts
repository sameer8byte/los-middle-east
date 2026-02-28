import { IsUUID, IsString, IsOptional } from "class-validator";
import { IsNumber, Min } from "class-validator";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;

export class PartialCollectionDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  loanId: string;

  @IsNumber()
  @Min(0)
  amount: number; // allows 0 and any positive number

  @IsOptional()
  @IsString()
  repaymentDate?: string;

  constructor(partial?: Partial<PartialCollectionDto>, dueDate?: string) {
    Object.assign(this, partial);
    if (!this.repaymentDate && dueDate) {
      this.repaymentDate = _dayjs(dueDate).startOf("day").toISOString();
    }
  }

  //isFinalPaymentPart  defaults to false
  @IsOptional()
  isFinalPaymentPart: boolean = false;

  // discountAmount
  // @IsOptional()
  // @IsNumber()
  // @Min(0)
  // discountAmount: number = 0;
}

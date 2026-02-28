import { IsString, IsUUID, IsOptional } from "class-validator";
import * as dayjs from "dayjs";

const _dayjs = dayjs.default;

export class CurrentRepaymentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  loanId: string;

  @IsOptional()
  @IsString()
  repaymentDate?: string;

  constructor(partial?: Partial<CurrentRepaymentDto>, dueDate?: string) {
    Object.assign(this, partial);
    if (!this.repaymentDate && dueDate) {
      this.repaymentDate = _dayjs(dueDate).startOf("day").toISOString();
    }
  }
}

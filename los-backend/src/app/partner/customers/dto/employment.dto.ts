// src/dto/upsert-employment.dto.ts

import { ModeOfSalary } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsString,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsEnum,
  IsDate,
  Matches,
  Validate,
} from "class-validator";
import { IsNotFutureDateConstraint } from "src/common/validators/is-not-future-date.validator";

export class UpsertEmploymentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  officialEmail?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  @Validate(IsNotFutureDateConstraint)
  joiningDate?: Date;

  @IsNumber()
  @IsOptional()
  salary?: number;

  @IsString()
  @IsOptional()
  companyAddress?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, {
    message: "Pin code must be a 6-digit number starting from 1 to 9",
  })
  pinCode?: string;

  @IsString()
  @IsOptional()
  uanNumber?: string;

  @Type(() => Number)
  @IsNumber()
  expectedDateOfSalary?: number;

  @IsOptional()
  modeOfSalary?: ModeOfSalary;

  // salaryExceedsBase
  @IsOptional()
  salaryExceedsBase?: boolean;
}

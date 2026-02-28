import { IsNotEmpty, IsString } from "class-validator";

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  from_date: Date;

  @IsString()
  @IsNotEmpty()
  to_date: Date;

  @IsString()
  @IsNotEmpty()
  redirect_url: string;
}

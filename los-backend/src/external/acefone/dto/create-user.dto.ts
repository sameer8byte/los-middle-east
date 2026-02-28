import { IsString, IsNotEmpty, IsEmail, IsBoolean, IsArray, IsNumber, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  number: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Login ID is required' })
  login_id: string;

  @IsNumber()
  @IsNotEmpty({ message: 'User role ID is required' })
  user_role: number;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsBoolean()
  @IsNotEmpty({ message: 'create_agent status is required' })
  create_agent: boolean;

  @IsBoolean()
  @IsNotEmpty({ message: 'create_web_login status is required' })
  create_web_login: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty({ message: 'Caller IDs are required' })
  caller_id: number[];

  @IsBoolean()
  @IsOptional()
  block_web_login?: boolean;

  @IsOptional()
  user_for_cdr?: object;

  @IsBoolean()
  @IsOptional()
  login_based_calling?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  agent_group?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  department?: string[];

  @IsString()
  @IsOptional()
  time_group?: string;

  @IsBoolean()
  @IsOptional()
  create_extension?: boolean;

  @IsBoolean()
  @IsOptional()
  enable_calling?: boolean;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  login_id?: string;

  @IsNumber()
  @IsOptional()
  user_role?: number;

  @IsString()
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsBoolean()
  @IsOptional()
  create_agent?: boolean;

  @IsBoolean()
  @IsOptional()
  create_web_login?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  caller_id?: number[];

  @IsBoolean()
  @IsOptional()
  block_web_login?: boolean;

  @IsOptional()
  user_for_cdr?: object;

  @IsBoolean()
  @IsOptional()
  login_based_calling?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  agent_group?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  department?: string[];

  @IsString()
  @IsOptional()
  time_group?: string;

  @IsBoolean()
  @IsOptional()
  create_extension?: boolean;

  @IsBoolean()
  @IsOptional()
  enable_calling?: boolean;
}

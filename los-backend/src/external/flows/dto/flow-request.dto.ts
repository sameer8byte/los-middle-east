import { IsString, IsNotEmpty } from 'class-validator';

export class FlowRequestDto {
  @IsString()
  @IsNotEmpty()
  encrypted_flow_data: string;

  @IsString()
  @IsNotEmpty()
  encrypted_aes_key: string;

  @IsString()
  @IsNotEmpty()
  initial_vector: string;
}
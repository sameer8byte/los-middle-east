import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class GetLeadDataDto {
  @IsString()
  @IsNotEmpty({ message: 'PAN card is required' })
//   @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
//     message: 'Invalid PAN card format. Expected format: ABCDE1234F',
//   })
  pancard: string;
}
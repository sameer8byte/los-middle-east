import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class ClickToDialDto {
  @IsString()
  @IsNotEmpty({ message: 'Destination number is required' })
  @Matches(/^\+?[0-9]{10,}$/, {
    message: 'Destination number must be a valid phone number (at least 10 digits)',
  })
  destination_number: string;

  @IsString()
  @IsNotEmpty({ message: 'Agent number is required' })
  @Matches(/^\+?[0-9]{10,}$/, {
    message: 'Agent number must be a valid phone number (at least 10 digits)',
  })
  agent_number: string;
}

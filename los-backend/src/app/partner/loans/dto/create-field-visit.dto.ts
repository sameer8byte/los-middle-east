import { IsBoolean } from 'class-validator';

export class FieldVisitDto {
  @IsBoolean()
  requireFieldVisit: boolean;
}
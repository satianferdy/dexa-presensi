import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AttendanceActionDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

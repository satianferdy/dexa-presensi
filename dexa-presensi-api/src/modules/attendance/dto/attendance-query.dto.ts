import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { DateRangeQueryDto } from '../../../common/date-range.dto';

export class AttendanceQueryDto extends DateRangeQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsIn(['CHECKED_IN', 'COMPLETE', 'INCOMPLETE']) status?:
    'CHECKED_IN' | 'COMPLETE' | 'INCOMPLETE';
}

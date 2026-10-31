import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  statusCode!: number;
  code!: string;
  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message!: string | string[];
  field?: string;
  requestId?: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' }) status!: string;
}

export class EmployeeSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  employeeNumber!: string;
  fullName!: string;
  department!: string;
}

export class EmployeeResponseDto extends EmployeeSummaryDto {
  @ApiProperty({ type: String, nullable: true }) position!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ format: 'email', example: 'employee001@example.test' }) email!: string;
  isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class PaginationDto {
  total!: number;
  page!: number;
  limit!: number;
}

export class EmployeePageDto extends PaginationDto {
  items!: EmployeeResponseDto[];
}

export class AuthUserResponseDto {
  @ApiProperty({ example: 'Asia/Jakarta' }) timezone!: string;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ enum: ['EMPLOYEE', 'HRD_ADMIN'] }) role!: string;
  @ApiProperty({ type: EmployeeSummaryDto, nullable: true }) employee!: EmployeeSummaryDto | null;
}

export class LoginResponseDto {
  accessToken!: string;
  user!: AuthUserResponseDto;
}

export class AttendanceResponseDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 32400,
    description:
      'Elapsed whole seconds between server check-in and check-out; no break deduction. Null until check-out.',
  })
  workedSeconds!: number | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) employeeId!: string;
  @ApiPropertyOptional({ type: EmployeeSummaryDto }) employee?: EmployeeSummaryDto;
  @ApiProperty({ format: 'date', example: '2026-10-31' }) workDate!: string;
  @ApiProperty({
    enum: ['CHECKED_IN', 'COMPLETE', 'INCOMPLETE'],
    description:
      'An unclosed record from a previous business date is INCOMPLETE; current-day unclosed attendance is CHECKED_IN.',
  })
  status!: string;
  @ApiProperty({ format: 'date-time' }) checkInAt!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) checkOutAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) checkInNote!: string | null;
  @ApiProperty({ type: String, nullable: true }) checkOutNote!: string | null;
  isLate!: boolean;
  @ApiProperty({ type: Boolean, nullable: true }) isEarlyCheckout!: boolean | null;
  checkInPhotoUrl!: string;
  @ApiProperty({ type: String, nullable: true }) checkOutPhotoUrl!: string | null;
}

export class PreviousIncompleteDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date' }) workDate!: string;
  @ApiProperty({ format: 'date-time' }) checkInAt!: string;
}

export class TodayAttendanceDto extends AttendanceResponseDto {
  @ApiProperty({ type: PreviousIncompleteDto, nullable: true })
  previousIncomplete!: PreviousIncompleteDto | null;
}

export class NotCheckedInDto {
  @ApiProperty({ enum: ['NOT_CHECKED_IN'] }) status!: string;
  @ApiProperty({ format: 'date' }) workDate!: string;
  @ApiProperty({ type: PreviousIncompleteDto, nullable: true })
  previousIncomplete!: PreviousIncompleteDto | null;
}

export class WorkSummaryDto {
  @ApiProperty({
    description: 'Completed elapsed seconds over all matching records, before pagination.',
  })
  totalWorkedSeconds!: number;
  completedRecords!: number;
  @ApiProperty({ description: 'Unclosed records from previous business dates.' })
  incompleteRecords!: number;
  @ApiProperty({ description: 'Current unclosed records; previous business dates are excluded.' })
  workingRecords!: number;
}

export class AttendancePageDto extends PaginationDto {
  items!: AttendanceResponseDto[];
  summary!: WorkSummaryDto;
}

export class RecapEmployeeDto extends EmployeeSummaryDto {
  @ApiProperty({
    description: 'Completed seconds for this employee over the selected dates and status filter.',
  })
  totalWorkedSeconds!: number;
  isActive!: boolean;
  records!: AttendanceResponseDto[];
}

export class AttendanceRecapDto extends PaginationDto {
  items!: RecapEmployeeDto[];
  @ApiProperty({ format: 'date' }) dateFrom!: string;
  @ApiProperty({ format: 'date' }) dateTo!: string;
}

export class AttendanceCountsDto {
  total!: number;
  completed!: number;
}

export class TrendDayDto extends AttendanceCountsDto {
  @ApiProperty({ format: 'date' }) day!: string;
}

export class EmployeeCountsDto {
  total!: number;
  active!: number;
  inactive!: number;
}

export class DashboardResponseDto {
  @ApiProperty({ format: 'date' }) businessDate!: string;
  timezone!: string;
  @ApiProperty({ format: 'date' }) dateFrom!: string;
  @ApiProperty({ format: 'date' }) dateTo!: string;
  employees!: EmployeeCountsDto;
  today!: AttendanceCountsDto;
  trend!: TrendDayDto[];
}

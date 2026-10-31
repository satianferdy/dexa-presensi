import {
  IsDateString,
  Matches,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'dateRangeOrder', async: false })
class DateRangeOrder implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const from = (args.object as DateRangeQueryDto).dateFrom;
    if (typeof from !== 'string' || typeof value !== 'string') return true;
    return from <= value;
  }
  defaultMessage(): string {
    return 'dateTo must be on or after dateFrom';
  }
}

export class DateRangeQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-10-01',
    description: 'Inclusive start date, YYYY-MM-DD. Must be on or before dateTo.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must use YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-10-31',
    description: 'Inclusive end date, YYYY-MM-DD.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must use YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  @Validate(DateRangeOrder)
  dateTo?: string;
}

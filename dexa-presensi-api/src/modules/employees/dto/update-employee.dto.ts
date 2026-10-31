import { IsBoolean, IsEmail, ValidateIf, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail, TrimString } from '../../../common/normalize.decorator';

export class UpdateEmployeeDto {
  @NormalizeEmail()
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;
  @TrimString()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  employeeNumber?: string;
  @TrimString()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName?: string;
  @TrimString()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department?: string;
  @TrimString()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  position?: string;
  @TrimString()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class UpdateEmployeeStatusDto {
  @IsBoolean() isActive!: boolean;
}

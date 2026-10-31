import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail, TrimString } from '../../../common/normalize.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @NormalizeEmail() @IsEmail() @MaxLength(255) email!: string;
  @ApiProperty({ minLength: 8, example: 'password', writeOnly: true })
  @IsString()
  @MinLength(8)
  password!: string;
  @TrimString() @IsString() @MinLength(1) @MaxLength(50) employeeNumber!: string;
  @TrimString() @IsString() @MinLength(1) @MaxLength(150) fullName!: string;
  @TrimString() @IsString() @MinLength(1) @MaxLength(100) department!: string;
  @TrimString() @IsOptional() @IsString() @MaxLength(100) position?: string;
  @TrimString() @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

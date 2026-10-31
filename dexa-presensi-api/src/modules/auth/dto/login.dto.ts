import { IsEmail, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/normalize.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'hrd@example.test', format: 'email' })
  @NormalizeEmail()
  @IsEmail()
  email!: string;
  @ApiProperty({ example: 'password', writeOnly: true })
  @IsString()
  @MinLength(1)
  password!: string;
}

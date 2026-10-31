import { ApiErrors } from '../../common/api-errors.decorator';
import { LoginResponseDto, AuthUserResponseDto } from '../../common/responses.dto';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthUser } from '../../common/auth-user';

@ApiErrors(400, 401, 429, 500)
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({
    summary: 'Log in as HR admin or employee',
    description:
      'Returns a bearer token and user profile. Demo password: password. Login limit: 5 requests per minute per client IP.',
  })
  @ApiCreatedResponse({ type: LoginResponseDto })
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiOperation({ summary: 'Get the current active user and business timezone' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}

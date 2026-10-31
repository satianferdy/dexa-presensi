import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ApiErrors } from './common/api-errors.decorator';
import { HealthResponseDto } from './common/responses.dto';
import { Controller, Get } from '@nestjs/common';

@ApiTags('health')
@ApiErrors(429, 500)
@Controller()
export class AppController {
  @ApiOperation({
    summary: 'Check that the API process responds',
    description: 'Liveness only; does not check database readiness.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

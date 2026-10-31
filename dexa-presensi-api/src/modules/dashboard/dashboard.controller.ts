import { ApiErrors } from '../../common/api-errors.decorator';
import { DashboardResponseDto } from '../../common/responses.dto';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { UserRole } from '../../database/entities/user.entity';
import { DashboardService } from './dashboard.service';
import { SummaryQueryDto } from './dto/summary-query.dto';

@ApiErrors(400, 401, 403, 429, 500)
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.HRD_ADMIN)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @ApiOperation({
    summary: 'Get employee counts and attendance trends',
    description:
      'Defaults to the last 7 business-calendar dates including today. Inclusive range: 1-31 days.',
  })
  @ApiOkResponse({ type: DashboardResponseDto })
  @Get('summary')
  summary(@Query() query: SummaryQueryDto) {
    return this.dashboard.summary(query);
  }
}

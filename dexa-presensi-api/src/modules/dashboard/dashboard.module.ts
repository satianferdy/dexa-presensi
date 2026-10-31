import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AttendancePolicyService } from '../attendance/attendance-policy.service';
import { RolesGuard } from '../../common/roles.guard';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, AttendancePolicyService, RolesGuard],
})
export class DashboardModule {}
